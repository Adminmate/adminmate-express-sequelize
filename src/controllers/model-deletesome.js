const compositeHelper = require('../helpers/composite');

module.exports = _conf => {
  const fnHelper = require('../helpers/functions')(_conf);

  const deleteSome = async (req, res) => {
    const modelName = req.params.model;
    const itemIds = req.body.ids;

    if (!itemIds || !itemIds.length) {
      return res.status(403).json({ message: 'Invalid request' });
    }

    const currentModel = fnHelper.getModelObject(modelName);
    if (!currentModel) {
      return res.status(403).json({ message: 'Invalid request' });
    }

    // Get model primary keys
    const primaryKeys = fnHelper.getModelPrimaryKeys(currentModel);
    const whereClause = compositeHelper.getSequelizeWhereClause(primaryKeys, itemIds);

    await currentModel
      .destroy({
        where: whereClause
      })
      .then(() => {
        res.json({ deletedCount: itemIds.length });
      })
      .catch(err => {
        const errorObject = fnHelper.buildError(err, 'An error occured when deleting the items');
        res.status(403).json(errorObject);
      });
  };

  return deleteSome;
};
