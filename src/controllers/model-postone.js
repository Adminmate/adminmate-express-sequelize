const { Op } = require('sequelize');
const compositeHelper = require('../helpers/composite');
const fnHelper = require('../helpers/functions');

module.exports.postOne = async (req, res) => {
  const modelName = req.params.model;
  const data = req.body.data;

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  // Get model primary keys
  const primaryKeys = fnHelper.getModelPrimaryKeys(currentModel);
  const idField = fnHelper.getModelIdField(currentModel);

  const newItem = new currentModel(data);
  const newSavedItem = await newItem.save().catch(e => {
    const errorObject = fnHelper.buildError(e, 'An error occured when saving the item');
    res.status(403).json(errorObject);
  });

  if (newSavedItem) {
    const newItem = newSavedItem.toJSON();

    // Annotate items
    compositeHelper.annotateItems(primaryKeys, [newItem]);

    res.json({
      data: {
        id: newItem[idField] // id and not _id to be generic
      }
    });
  }
};