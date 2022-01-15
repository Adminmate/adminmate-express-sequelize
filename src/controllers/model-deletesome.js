const compositeHelper = require('../helpers/composite');
const fnHelper = require('../helpers/functions');

module.exports.deleteSome = async (req, res) => {
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
    .catch(e => {
      res.status(403).json({ message: e.message || 'Unable to delete the model items' });
    });
};