const { Op } = require('sequelize');
const fnHelper = require('../helpers/functions');

module.exports.putOne = async (req, res) => {
  const modelName = req.params.model;
  const modelItemId = req.params.id;
  const data = req.body.data;

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  // const { model, itemEditableKeys } = models[modelName];

  // Only keep authorized keys
  // const cleanData = {};
  // updatableFields.forEach(updatableField => {
  //   const fieldValue = global._.get(data, updatableField);
  //   if (fieldValue) {
  //     global._.set(cleanData, updatableField, fieldValue)
  //   }
  // });

  const cleanData = data;

  if (Object.keys(cleanData).length) {
    try {
      await currentModel.update(cleanData, { where: { id: modelItemId } });
      res.json({ data: cleanData });
    }
    catch(e) {
      const errorObject = fnHelper.buildError(e, 'Unable to update the model');
      res.status(403).json(errorObject);
    }
  }
  else {
    res.json({});
  }
};