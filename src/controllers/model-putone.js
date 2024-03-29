// const _ = require('lodash');
const compositeHelper = require('../helpers/composite');

module.exports = _conf => {
  const fnHelper = require('../helpers/functions')(_conf);

  const putOne = async (req, res) => {
    const modelName = req.params.model;
    const modelItemId = req.params.id;
    const data = req.body.data;

    const currentModel = fnHelper.getModelObject(modelName);
    if (!currentModel) {
      return res.status(403).json({ message: 'Invalid request' });
    }

    // Get model primary keys
    const primaryKeys = fnHelper.getModelPrimaryKeys(currentModel);
    const whereClause = compositeHelper.getSequelizeWhereClause(primaryKeys, [modelItemId]);

    // const { model, itemEditableKeys } = models[modelName];

    // Only keep authorized keys
    // const cleanData = {};
    // updatableFields.forEach(updatableField => {
    //   const fieldValue = _.get(data, updatableField);
    //   if (fieldValue) {
    //     global._.set(cleanData, updatableField, fieldValue)
    //   }
    // });

    const cleanData = data;

    if (Object.keys(cleanData).length) {
      try {
        await currentModel.update(cleanData, { where: whereClause });
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

  return putOne;
};
