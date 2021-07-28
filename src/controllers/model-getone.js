const { Op } = require('sequelize');
const fnHelper = require('../helpers/functions');

module.exports.getOne = async (req, res) => {
  const modelName = req.params.model;
  const modelItemId = req.params.id;
  const refFields = req.body.refFields || {};

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  const keys = fnHelper.getModelProperties(currentModel);
  const defaultFieldsToFetch = keys.map(key => key.path);
  const fieldsToFetchSafe = Array.isArray(req.body.fields) && req.body.fields.length ? req.body.fields : defaultFieldsToFetch;

  // Build ref fields for the model (for sequelize include purpose)
  const includeConfig = fnHelper.getIncludeParams(currentModel, keys, fieldsToFetchSafe, refFields);

  let data = await currentModel
    .findOne({
      where: {
        id: modelItemId
      },
      attributes: [...fieldsToFetchSafe, 'id'], // just to be sure id is in
      include: includeConfig
    })
    .catch(e => {
      res.status(403).json({ message: e.message });
    });

  if (!data) {
    return res.status(403).json();
  }

  // Format data for the admin dashboard
  data = data.toJSON();
  includeConfig.forEach(ftp => {
    const refId = data[ftp.path];
    data[ftp.path] = { ...data[ftp.as], id: refId };
    delete data[ftp.as];
  });

  data = fnHelper.refFields(data, includeConfig);

  res.json({
    data
  });
};