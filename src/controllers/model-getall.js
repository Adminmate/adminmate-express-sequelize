const { uniq, intersection } = require('lodash');
const { Op } = require('sequelize');
const compositeHelper = require('../helpers/composite');

module.exports = _conf => {
  const fnHelper = require('../helpers/functions')(_conf);

  const getAll = async (req, res) => {
    const modelName = req.params.model;
    const segment = req.query.segment;
    const search = (req.query.search || '').trim();
    const filters = req.query.filters;
    const fieldsToFetch = req.headers['am-model-fields'] || [];
    const refFields = req.headers['am-ref-fields'] || {};
    const inlineActions = req.headers['am-inline-actions'] || [];
    const fieldsToSearchIn = req.query.search_in_fields || [];
    const page = parseInt(req.query.page || 1);
    const rowsPerPage = parseInt(req.query.rows || 10);
    const order = req.query.order || null;
    let defaultOrdering = [];

    const currentModel = fnHelper.getModelObject(modelName);
    if (!currentModel) {
      return res.status(403).json({ message: 'Invalid request' });
    }

    // Model actions
    const currentModelActions = fnHelper.getModelActions(modelName);

    // Get model real name for some requests
    const modelRealName = fnHelper.getModelRealname(currentModel);

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
    let fieldsToFetchSafe = keys
      .filter(key => !key.path.includes('.'))
      .map(key => key.path);

    // If we get specific fields to display
    if (Array.isArray(fieldsToFetch) && fieldsToFetch.length > 0) {
      const flatKeys = keys.map(key => key.path);
      const validKeys = intersection(fieldsToFetch, flatKeys);
      if (validKeys.length > 0) {
        fieldsToFetchSafe = validKeys;
      }
    }

    // Construct default fields to search in (only String type)
    const defaultFieldsToSearchIn = keys
      .filter(key => ['String'].includes(key.type))
      .map(key => key.path);
    const fieldsToSearchInSafe = Array.isArray(fieldsToSearchIn) && fieldsToSearchIn.length ? fieldsToSearchIn : defaultFieldsToSearchIn;

    // Build ref fields for the model (for sequelize include purpose)
    const includeConfig = fnHelper.getIncludeParams(currentModel, keys, fieldsToFetchSafe, refFields);

    const queriesArray = [];

    // Get sequelize instance -------------------------------------------------------------
    const sequelizeInstance = currentModel.sequelize;

    // Search -----------------------------------------------------------------------------

    if (search) {
      const searchQuery = fnHelper.constructSearch(modelRealName, search, fieldsToSearchInSafe, sequelizeInstance);
      queriesArray.push(searchQuery);
    }

    // Filters ----------------------------------------------------------------------------

    if (filters && filters.operator && filters.list && filters.list.length) {
      const filtersQuery = fnHelper.constructQuery(modelRealName, filters.list, filters.operator, sequelizeInstance);
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
    const attributes = uniq([...fieldsToFetchSafe, ...primaryKeys]);

    // Fetch data
    const data = await currentModel
      .findAndCountAll({
        where: findParams,
        attributes,
        include: includeConfig,
        order: orderSafe,
        // Pagination
        offset: rowsPerPage * (page - 1),
        limit: rowsPerPage
      })
      .catch(e => {
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
    const nbPage = Math.ceil(dataCount / rowsPerPage);

    // Inline actions button
    const _inlineActions = currentModelActions.filter(action => inlineActions.includes(action.code));
    if (_inlineActions.length) {
      formattedData.forEach(item => {
        item._am_inline_actions = _inlineActions
          .filter(action => typeof action.filter === 'undefined' || action.filter(item))
          .map(action => action.code);
      })
    }

    res.json({
      data: formattedData,
      count: dataCount,
      pagination: {
        current: page,
        count: nbPage,
        rows_per_page: rowsPerPage
      }
    });
  };

  return getAll;
};
