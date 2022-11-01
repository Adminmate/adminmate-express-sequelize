const { Op } = require('sequelize');
const Joi = require('joi');

module.exports = _conf => {
  const fnHelper = require('../helpers/functions')(_conf);

  const chartRanking = async (currentModel, data) => {
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
      filters: Joi.object({
        operator: Joi.string().valid('and', 'or').required(),
        list: Joi.array().required()
      })
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

    // Filters
    let findParams = {};
    if (data.filters && data.filters.operator && data.filters.list && data.filters.list.length > 0) {
      // Get model real name for some requests
      const modelRealName = fnHelper.getModelRealname(currentModel);
      const filtersQuery = fnHelper.constructQuery(modelRealName, data.filters.list, data.filters.operator, sequelizeInstance);
      if (filtersQuery) {
        findParams = { [Op.and]: filtersQuery };
      }
    }

    try {
      const repartitionData = await relationshipModel.findAll({
        attributes: [
          [ sequelizeInstance.col(`${refModel.as}.${primaryKey}`), 'item_id' ],
          [ sequelizeInstance.col(`${refModel.as}.${data.field}`), 'key' ],
          [ sequelizeInstance.fn(data.relationship_operation, seqFnField), 'value' ]
        ],
        include: includeConfig,
        group: [`${refModel.as}.${primaryKey}`],
        where: findParams,
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

  return chartRanking;
};
