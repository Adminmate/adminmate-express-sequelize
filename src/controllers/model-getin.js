const compositeHelper = require('../helpers/composite');

module.exports = _conf => {
  const fnHelper = require('../helpers/functions')(_conf);

  const getIn = async (modelName, ids) => {
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

    const cleanItems = items.map(item => item.toJSON())

    return cleanItems;
  };

  return getIn;
};