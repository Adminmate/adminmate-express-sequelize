const compositeHelper = require('../helpers/composite');
const fnHelper = require('../helpers/functions');

module.exports.getRefs = async (req, res) => {
  const modelName = req.params.model;
  const ids = req.query.ids;
  const refFields = req.headers['am-ref-fields'] || {};
  const nbItemPerPage = 20;

  if (!ids) {
    return res.status(403).json({ message: 'Missing parameter ids' });
  }

  const fieldsToFetchSafe = refFields[modelName];

  // If no ref fields, return default response
  if (!fieldsToFetchSafe) {
    return res.json({
      data: ids.map(id => ({ value: id, label: id }))
    });
  }

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  // Get model primary keys
  const primaryKeys = fnHelper.getModelPrimaryKeys(currentModel);
  const idField = fnHelper.getModelIdField(currentModel);
  const whereClause = compositeHelper.getSequelizeWhereClause(primaryKeys, ids);
  const fieldsToFetchSafeArray = [...fieldsToFetchSafe.split(' '), ...primaryKeys];


  const data = await currentModel
    .findAll({
      where: whereClause,
      attributes: fieldsToFetchSafeArray,
      limit: nbItemPerPage
    })
    .catch(e => {
      res.status(403).json({ message: e.message });
    });

  if (!data) {
    return res.status(403).json();
  }

  // Clean data
  const cleanData = data.map(item => item.toJSON());

  // Annotate items
  compositeHelper.annotateItems(primaryKeys, cleanData);

  // Format the response
  const formattedData = ids.map(_id => {
    const match = data.find(d => d[idField].toString() === _id.toString());
    const label = match ? fnHelper.fieldsToValues(fieldsToFetchSafe, match) : _id;
    return { value: _id, label };
  });

  res.json({
    data: formattedData
  });
};