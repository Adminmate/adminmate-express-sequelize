const { Op } = require('sequelize');
const fnHelper = require('../helpers/functions');

module.exports.getAll = async (req, res) => {
  const modelName = req.params.model;
  const segment = req.body.segment;
  const search = (req.body.search || '').trim();
  const filters = req.body.filters;
  const fieldsToFetch = req.body.fields || [];
  const refFields = req.body.refFields;
  const fieldsToSearchIn = req.body.fieldsToSearchIn || [];
  const page = parseInt(req.body.page || 1);
  const nbItemPerPage = 10;
  const defaultOrdering = [ ['id', 'DESC'] ];
  const order = req.body.order || null;

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
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
  // console.log('=====includeConfig', includeConfig);

  // Init request params
  let params = {};

  // If there is a text search query
  if (search) {
    params = fnHelper.constructSearch(search, fieldsToSearchInSafe);
  }

  // Filters
  if (filters && filters.operator && filters.list && filters.list.length) {
    const filtersQuery = fnHelper.constructQuery(filters.list, filters.operator);
    if (filtersQuery) {
      params = { [Op.and]: [params, filtersQuery] };
    }
  }

  // Segments
  if (segment && segment.type === 'code') {
    const modelSegments = fnHelper.getModelSegments(modelName);
    if (modelSegments) {
      const matchingSegment = modelSegments.find(s => s.code === segment.data);
      if (matchingSegment) {
        params = { [Op.and]: [params, matchingSegment.query] };
      }
    }
  }

  // console.log('===params', params);

  // Fetch data
  const data = await currentModel
    .findAndCountAll({
      where: params,
      attributes: [...fieldsToFetchSafe, 'id'], // just to be sure id is in
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