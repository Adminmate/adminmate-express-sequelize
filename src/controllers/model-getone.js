const _ = require('lodash');
const { Op } = require('sequelize');
const compositeHelper = require('../helpers/composite');
const fnHelper = require('../helpers/functions');

module.exports.getOne = async (req, res) => {
  const modelName = req.params.model;
  const modelItemId = req.params.id;
  const fieldsToFetch = req.headers['am-model-fields'] || [];
  const refFields = req.headers['am-ref-fields'] || {};

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  // Get model primary keys
  const primaryKeys = fnHelper.getModelPrimaryKeys(currentModel);
  const whereClause = compositeHelper.getSequelizeWhereClause(primaryKeys, [modelItemId]);

  const keys = fnHelper.getModelProperties(currentModel);
  const defaultFieldsToFetch = keys.map(key => key.path);
  const fieldsToFetchSafe = Array.isArray(fieldsToFetch) && fieldsToFetch.length ? fieldsToFetch : defaultFieldsToFetch;

  // Build ref fields for the model (for sequelize include purpose)
  const includeConfig = fnHelper.getIncludeParams(currentModel, keys, fieldsToFetchSafe, refFields);

  // Attributes to fetch (just to be sure primary keys are in)
  const attributes = _.uniq([...fieldsToFetchSafe, ...primaryKeys]);

  let data = await currentModel
    .findOne({
      where: whereClause,
      attributes,
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

  // Annotate items
  compositeHelper.annotateItems(primaryKeys, [data]);

  res.json({
    data
  });
};