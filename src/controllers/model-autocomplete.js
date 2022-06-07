const _ = require('lodash');
const fnHelper = require('../helpers/functions');

module.exports.getAutocomplete = async (req, res) => {
  const modelName = req.params.model;
  const search = (req.query.s || '').trim();
  const refFields = req.headers['am-ref-fields'] || {};
  const maxItem = 10;

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel || !search) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  // Get model primary keys
  const primaryKeys = fnHelper.getModelPrimaryKeys(currentModel);
  const keys = fnHelper.getModelProperties(currentModel);
  const defaultFieldsToSearchIn = keys.filter(key => ['String'].includes(key.type)).map(key => key.path);
  const defaultFieldsToFetch = keys.filter(key => !key.path.includes('.')).map(key => key.path);

  const modelNameSafe = fnHelper.getModelRealname(currentModel);
  const fieldsToSearchIn = refFields[modelNameSafe] ? refFields[modelNameSafe].split(' ') : defaultFieldsToSearchIn;
  const fieldsToFetch = refFields[modelNameSafe] ? refFields[modelNameSafe].split(' ') : defaultFieldsToFetch;

  // Get sequelize instance -------------------------------------------------------------
  const sequelizeInstance = currentModel.sequelize;

  // Search clause
  const findParams = fnHelper.constructSearch(search, fieldsToSearchIn, sequelizeInstance);

  // Fetch data
  const data = await currentModel
    .findAndCountAll({
      where: findParams,
      attributes: [...fieldsToFetch, ...primaryKeys],
      limit: maxItem
    })
    .catch(e => {
      res.status(403).json({ message: e.message });
    });

  if (!data) {
    return res.status(403).json();
  }

  // Format data for the admin dashboard
  let formattedData = data.rows
    .map(item => item.toJSON());

  // Field to be used as the item's label
  let fieldsToDisplay;
  if (refFields[modelNameSafe]) {
    fieldsToDisplay = refFields[modelNameSafe];
  }
  else if (primaryKeys.length > 0) {
    fieldsToDisplay = primaryKeys[0];
  }
  else {
    fieldsToDisplay = keys[0].path;
  }

  const mainPrimaryKey = primaryKeys[0];
  if (formattedData.length) {
    formattedData = formattedData.map(d => {
      const label = fieldsToDisplay.replace(/[a-z._]+/gi, word => _.get(d, word));
      return { label, value: d[mainPrimaryKey] };
    });
  }

  res.json({ data: formattedData });
};