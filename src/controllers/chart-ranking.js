const Joi = require('@hapi/joi');
const _ = require('lodash');
const fnHelper = require('../helpers/functions');

module.exports = async (currentModel, data) => {
  const sequelizeInstance = currentModel.sequelize;

  const paramsSchema = Joi.object({
    type: Joi.string().required(),
    model: Joi.string().required(),
    field: Joi.string().required(),
    relationship_model: Joi.string().required(),
    relationship_model_ref_field: Joi.string().required(),
    relationship_operation: Joi.string().required(),
    relationship_field: Joi.alternatives().conditional('relationship_operation', {
      not: 'count',
      then: Joi.string().required(),
      otherwise: Joi.string()
    }),
    limit: Joi.number().optional(),
  });

  // Validate params
  const { error } = paramsSchema.validate(data);
  if (error) {
    return {
      success: false,
      message: error.details[0].message
    };
  }

  // Apply a default limit of 5 results
  const limit = data.limit || 5;

  const relationshipModel = fnHelper.getModelObject(data.relationship_model);
  if (!relationshipModel) {
    return {
      success: false,
      message: 'Invalid request'
    };
  }

  const seqFnField = data.relationship_field ? sequelizeInstance.col(data.relationship_field) : 1;

  // Ref field in the relationship model
  const joinField = data.relationship_model_ref_field;

  // Get model properties
  const keys = fnHelper.getModelPrimaryKeys(currentModel);
  const primaryKey = keys[0];
  const relationKeys = fnHelper.getModelProperties(relationshipModel);

  // Construct default fields to fetch
  const defaultFieldsToFetch = [ joinField ];

  // Build ref fields for the model (for sequelize include purpose)
  const includeConfig = fnHelper.getIncludeParams(relationshipModel, relationKeys, defaultFieldsToFetch, {});
  const refModel = includeConfig.find(ic => ic.path === joinField);

  try {
    const repartitionData = await relationshipModel.findAll({
      attributes: [
        [ sequelizeInstance.col(`${refModel.as}.${primaryKey}`), 'item_id' ],
        [ sequelizeInstance.col(`${refModel.as}.${data.field}`), 'key' ],
        [ sequelizeInstance.fn(data.relationship_operation, seqFnField), 'value' ]
      ],
      include: includeConfig,
      group: [`${refModel.as}.${primaryKey}`],
      order: sequelizeInstance.literal('value DESC'),
      limit,
      raw: true
    });

    const cleanData = repartitionData.map(d => ({
      key: d.key,
      value: d.value,
      item_id: d.item_id,
      item_model: data.model
    }));

    return {
      success: true,
      data: {
        config: null,
        data: cleanData
      }
    };
  }
  catch(e) {
    return {
      success: false,
      message: e.message
    };
  }
};
