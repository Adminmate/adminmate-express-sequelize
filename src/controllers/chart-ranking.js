const _ = require('lodash');
const fnHelper = require('../helpers/functions');

module.exports = async (currentModel, data) => {
  const sequelizeInstance = currentModel.sequelize;

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
  const keys = fnHelper.getModelProperties(relationshipModel);

  // Construct default fields to fetch
  const defaultFieldsToFetch = [ joinField ];

  console.log('===defaultFieldsToFetch', defaultFieldsToFetch);

  // Build ref fields for the model (for sequelize include purpose)
  const includeConfig = fnHelper.getIncludeParams(relationshipModel, keys, defaultFieldsToFetch, {});
  console.log('=====includeConfig', includeConfig);

  const refModel = includeConfig.find(ic => ic.path === joinField);
  console.log('========refModel', refModel);

  // Query database
  const repartitionData = await relationshipModel.findAll({
    attributes: [
      [ sequelizeInstance.col(`${refModel.as}.id`), 'item_id' ],
      [ sequelizeInstance.col(`${refModel.as}.firstname`), 'key' ],
      [ sequelizeInstance.fn(data.relationship_operation, seqFnField), 'value' ]
    ],
    include: includeConfig,
    group: [`${refModel.as}.id`],
    limit: data.limit,
    raw: true
  });

  const cleanData = repartitionData.map(d => ({
    key: d.key,
    value: d.value,
    item_id: d.item_id,
    item_model: data.model
  }));

  // Order results
  const orderedData = _.orderBy(cleanData, 'value', 'desc');

  return {
    success: true,
    data: {
      config: null,
      data: orderedData
    }
  };
};