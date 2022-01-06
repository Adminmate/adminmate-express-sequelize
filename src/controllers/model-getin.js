const compositeHelper = require('../helpers/composite');
const fnHelper = require('../helpers/functions');

module.exports.getIn = async (modelName, ids) => {
  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return null;
  }

  // Get model primary keys
  const primaryKeys = fnHelper.getModelPrimaryKeys(currentModel);
  const whereClause = compositeHelper.getSequelizeWhereClause(primaryKeys, ids);

  // Get corresponding items
  const items = await currentModel
    .findAll({
      where: whereClause
    });

  return items;
};