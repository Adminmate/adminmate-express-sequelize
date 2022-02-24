const _ = require('lodash');
const { Op } = require('sequelize');
const fnHelper = require('../helpers/functions');
const compositeHelper = require('../helpers/composite');

module.exports.getAll = async (req, res) => {
  const modelName = req.params.model;
  const segment = req.query.segment;
  const search = (req.query.search || '').trim();
  const filters = req.query.filters;
  const fieldsToFetch = req.headers['am-model-fields'] || [];
  const refFields = req.headers['am-ref-fields'] || {};
  const fieldsToSearchIn = req.query.search_in_fields || [];
  const page = parseInt(req.query.page || 1);
  const nbItemPerPage = 10;
  const order = req.query.order || null;
  let defaultOrdering = [];

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  // Get model primary keys
  const primaryKeys = fnHelper.getModelPrimaryKeys(currentModel);
  if (primaryKeys && primaryKeys.length) {
    defaultOrdering = [ [primaryKeys[0], 'DESC'] ];
  }

  // Get model properties
  const keys = fnHelper.getModelProperties(currentModel);

  // Ordering config
  const orderSafe = fnHelper.validateOrderStructure(order) ? order : defaultOrdering;

  // Construct default fields to fetch
  const defaultFieldsToFetch = keys
    .filter(key => !key.path.includes('.'))
    .map(key => key.path);
  const fieldsToFetchSafe = Array.isArray(fieldsToFetch) && fieldsToFetch.length ? fieldsToFetch : defaultFieldsToFetch;

  // Construct default fields to search in (only String type)
  const defaultFieldsToSearchIn = keys
    .filter(key => ['String'].includes(key.type))
    .map(key => key.path);
  const fieldsToSearchInSafe = Array.isArray(fieldsToSearchIn) && fieldsToSearchIn.length ? fieldsToSearchIn : defaultFieldsToSearchIn;

  // Build ref fields for the model (for sequelize include purpose)
  const includeConfig = fnHelper.getIncludeParams(currentModel, keys, fieldsToFetchSafe, refFields);

  const queriesArray = [];

  // Search -----------------------------------------------------------------------------

  if (search) {
    const searchQuery = fnHelper.constructSearch(search, fieldsToSearchInSafe);
    queriesArray.push(searchQuery);
  }

  // Filters ----------------------------------------------------------------------------

  if (filters && filters.operator && filters.list && filters.list.length) {
    const filtersQuery = fnHelper.constructQuery(filters.list, filters.operator);
    if (filtersQuery) {
      queriesArray.push(filtersQuery);
    }
  }

  // Segments ---------------------------------------------------------------------------

  if (segment && segment.type === 'code' && segment.data) {
    const modelSegment = fnHelper.getModelSegment(modelName, segment.data);
    if (modelSegment) {
      queriesArray.push(modelSegment.query);
    }
  }

  const findParams = queriesArray.length ? { [Op.and]: queriesArray } : {};

  // Attributes to fetch (just to be sure primary keys are in)
  const attributes = _.uniq([...fieldsToFetchSafe, ...primaryKeys]);

  // Fetch data
  const data = await currentModel
    .findAndCountAll({
      where: findParams,
      attributes,
      include: includeConfig,
      order: orderSafe,
      // Pagination
      offset: nbItemPerPage * (page - 1),
      limit: nbItemPerPage
    })
    .catch(e => {
      console.log('===err', e);
      res.status(403).json({ message: e.message });
    });

  if (!data) {
    return res.status(403).json();
  }

  // Format data for the admin dashboard
  const formattedData = data.rows
    .map(item => item.toJSON())
    .map(item => {
      includeConfig.forEach(ftp => {
        const refId = item[ftp.path];
        item[ftp.path] = { ...item[ftp.as], id: refId };
        delete item[ftp.as];
      });
      return item;
    })
    // Make ref fields appeared as link in the dashboard
    .map(item => {
      return fnHelper.refFields(item, includeConfig);
    });

  // Annotate items
  compositeHelper.annotateItems(primaryKeys, formattedData);

  // Total result - not taking pagination in account
  const dataCount = data.count;
  const nbPage = Math.ceil(dataCount / nbItemPerPage);

  res.json({
    data: formattedData,
    count: dataCount,
    pagination: {
      current: page,
      count: nbPage
    }
  });
};