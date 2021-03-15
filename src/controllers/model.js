// const mongoose = require('mongoose');
const fnHelper = require('../helpers/functions');

module.exports.getModelsProperties = (req, res) => {
  const modelsProperties = [];

  global._amConfig.models.forEach(modelConfig => {
    const modelProperties = fnHelper.getModelProperties(modelConfig.model);
    modelProperties.map(property => {
      modelsProperties.push({
        model: modelConfig.slug,
        path: property.path
      });
    });
  });

  res.json({ properties: modelsProperties });
};

module.exports.getModels = (req, res) => {
  let models = [];

  global._amConfig.models.forEach(modelConfig => {
    const modelObject = {
      slug: modelConfig.slug,
      properties: fnHelper.getModelProperties(modelConfig.model),
      smart_actions: [],
      segments: []
    };

    // Add smart actions if present
    if (modelConfig.smartActions) {
      modelObject.smart_actions = modelConfig.smartActions;
    }

    // Add smart actions if present
    if (modelConfig.segments) {
      modelObject.segments = modelConfig.segments.map(segment => ({ label: segment.label, code: segment.code }));
    }

    models.push(modelObject);
  });

  res.json({ models });
};

module.exports.getAutocomplete = async (req, res) => {
  const modelName = req.params.model;
  const search = (req.body.search || '').trim();
  const refFields = req.body.refFields;
  const maxItem = 10;

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel || !search) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  const keys = fnHelper.getModelProperties(currentModel);
  const defaultFieldsToSearchIn = keys.filter(key => ['String'].includes(key.type)).map(key => key.path);
  const defaultFieldsToFetch = keys.filter(key => !key.path.includes('.')).map(key => key.path);

  const modelNameSafe = currentModel.collection.collectionName;
  const fieldsToSearchIn = refFields[modelNameSafe] ? refFields[modelNameSafe].split(' ') : defaultFieldsToSearchIn;
  const fieldsToFetch = refFields[modelNameSafe] ? refFields[modelNameSafe].split(' ') : defaultFieldsToFetch;
  const params = fnHelper.constructSearch(search, fieldsToSearchIn);

  console.log('====getAutocomplete', params['$or'], fieldsToFetch);

  const data = await currentModel
    .find(params)
    .select(fieldsToFetch)
    // .populate(fieldsToPopulate)
    // .sort(sortingFields)
    .limit(maxItem)
    .lean()
    .catch(e => {
      res.status(403).json({ message: e.message });
    });

  if (!data) {
    return res.status(403).json();
  }

  // Field to be used as the item's label
  const fieldsToDisplay = refFields[modelNameSafe] ? refFields[modelNameSafe] : '_id';

  let formattedData = [];
  if (data.length) {
    formattedData = data.map(d => {
      const label = fieldsToDisplay.replace(/[a-z._]+/gi, word => global._.get(d, word));
      return { label, value: d._id };
    });
  }

  res.json({ data: formattedData });
};

module.exports.postOne = async (req, res) => {
  const modelName = req.params.model;
  const data = req.body.data;

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  const newItem = new currentModel(data);
  const newSavedItem = await newItem.save().catch(e => {
    const errorObject = fnHelper.buildError(e, 'An error occured when saving the item');
    res.status(403).json(errorObject);
  });

  if (newSavedItem) {
    res.json({ data: { id: newSavedItem._id } }); // id and not _id to be generic
  }
};

module.exports.get = async (req, res) => {
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

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  // Get model properties
  const keys = fnHelper.getModelProperties(currentModel);

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
  console.log('=====includeConfig', includeConfig);

  // Init request params
  let params = {};

  // If there is a text search query
  if (search) {
    params = fnHelper.constructSearch(search, fieldsToSearchInSafe, includeConfig);
  }

  console.log('===params', params)

  // Filters
  if (filters && filters.operator && filters.list && filters.list.length) {
    const filtersQuery = fnHelper.constructQuery(filters.list, filters.operator);
    if (filtersQuery) {
      params = { $and: [params, filtersQuery] };
    }
  }

  // Segments
  if (segment && segment.type === 'code') {
    const modelSegments = fnHelper.getModelSegments(modelName);
    if (modelSegments) {
      const matchingSegment = modelSegments.find(s => s.code === segment.data);
      if (matchingSegment) {
        params = { $and: [params, matchingSegment.query] };
      }
    }
  }

  // Fetch data
  const data = await currentModel
    .findAndCountAll({
      where: params,
      attributes: [...fieldsToFetchSafe, 'id'], // just to be sure id is in
      include: includeConfig,
      order: defaultOrdering,
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
  const fieldsToFetch = req.body.fields ? req.body.fields : defaultFieldsToFetch;

  // Build ref fields for the model (for mongoose population purpose)
  const fieldsToPopulate = fnHelper.getFieldsToPopulate(keys, fieldsToFetch, refFields);

  let data = await currentModel
    .findByPk(modelItemId)
    .catch(e => {
      res.status(403).json({ message: e.message });
    });

  // let data = await currentModel
  //   .findById(modelItemId)
  //   .select(fieldsToFetch)
  //   .populate(fieldsToPopulate)
  //   .lean()
  //   .catch(e => {
  //     res.status(403).json({ message: e.message });
  //   });

  if (!data) {
    return res.status(403).json();
  }

  data = fnHelper.refFields(data, fieldsToPopulate);

  res.json({
    data
  });
};

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

module.exports.deleteSome = async (req, res) => {
  const modelName = req.params.model;
  const itemIds = req.body.ids;

  if (!itemIds || !itemIds.length) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  const deleteReq = await currentModel
    .destroy({
      where: { id: itemIds }
    })
    .catch(e => {
      res.status(403).json({ message: 'Unable to delete the model items' });
    });

  res.json({ deletedCount: itemIds.length });
};

module.exports.customQuery = async (req, res) => {
  const data = req.body.data;
  const modelName = data.model;

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  if (data.type === 'pie') {
    let sum = 1;
    if (data.field && data.operation === 'sum') {
      sum = `$${data.field}`;
    }

    const repartitionData = await currentModel
      .aggregate([
        {
          $group: {
            _id: `$${data.group_by}`,
            count: { $sum: sum },
          }
        },
        {
          $project: {
            key: '$_id',
            value: '$count',
            _id: false
          }
        }
      ])
      .sort({ key: 1 });

    res.json({ data: repartitionData });
  }
  else if (data.type === 'single_value') {
    if (data.operation === 'sum') {
      const sumData = await currentModel
        .aggregate([{
          $group: {
            _id: `$${data.group_by}`,
            count: { $sum: `$${data.field}` },
          }
        }]);

      if (!sumData || !sumData[0] || typeof sumData[0].count !== 'number') {
        return res.status(403).json();
      }

      res.json({ data: sumData[0].count });
    }
    else {
      const dataCount = await currentModel.countDocuments({});
      res.json({ data: dataCount });
    }
  }
  else if (data.type === 'bar' || data.type === 'line') {
    const toSum = data.field && data.operation === 'sum' ? `$${data.field}` : 1;

    let matchReq = {};
    let groupFormat = '';

    // Day timeframe
    if (data.timeframe === 'day') {
      matchReq = {
        '$gte': new Date(global._moment().subtract(30, 'day').startOf('day').format()),
        '$lte': new Date(global._moment().endOf('day').format())
      };
      groupFormat = '%Y-%m-%d';
    }
    // Week timeframe
    else if (data.timeframe === 'week') {
      matchReq = {
        '$gte': new Date(global._moment().subtract(26, 'week').startOf('week').format()),
        '$lte': new Date(global._moment().endOf('week').format())
      };
      groupFormat = '%V';
    }
    // Month timeframe
    else if (data.timeframe === 'month') {
      matchReq = {
        '$gte': new Date(global._moment().subtract(12, 'month').startOf('month').format()),
        '$lte': new Date(global._moment().endOf('month').format())
      };
      groupFormat = '%m';
    }
    // Year timeframe
    else if (data.timeframe === 'year') {
      matchReq = {
        '$gte': new Date(global._moment().subtract(8, 'year').startOf('year').format()),
        '$lte': new Date(global._moment().endOf('year').format())
      };
      groupFormat = '%Y';
    }

    if (!groupFormat) {
      return res.status(403).json({ message: 'Invalid request' });
    }

    const repartitionData = await currentModel
      .aggregate([
        {
          $match: {
            [data.group_by]: matchReq
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: `$${data.group_by}` } },
            count: { $sum: toSum }
          }
        },
        {
          $project: {
            key: '$_id',
            value: '$count',
            _id: false
          }
        }
      ]);

    const formattedData = [];

    // Day timeframe
    if (data.timeframe === 'day') {
      for (let i = 0; i < 30; i++) {
        const currentDate = global._moment().subtract(i, 'day');
        const countForTheTimeframe = global._.find(repartitionData, { key: currentDate.format('YYYY-MM-DD') });
        formattedData.push({
          key: currentDate.format('DD/MM'),
          value: countForTheTimeframe ? countForTheTimeframe.value : 0
        });
      }
    }
    // Week timeframe
    else if (data.timeframe === 'week') {
      for (let i = 0; i < 26; i++) {
        const currentWeek = global._moment().subtract(i, 'week');

        const countForTheTimeframe = global._.find(repartitionData, { key: currentWeek.format('WW') });
        formattedData.push({
          key: currentWeek.startOf('week').format('DD/MM'),
          value: countForTheTimeframe ? countForTheTimeframe.value : 0
        });
      }
    }
    // Month timeframe
    else if (data.timeframe === 'month') {
      for (let i = 0; i < 12; i++) {
        const currentMonth = global._moment().subtract(i, 'month');

        const countForTheTimeframe = global._.find(repartitionData, { key: currentMonth.format('MM') });
        formattedData.push({
          key: currentMonth.startOf('month').format('MMM'),
          value: countForTheTimeframe ? countForTheTimeframe.value : 0
        });
      }
    }
    // Year timeframe
    else if (data.timeframe === 'year') {
      for (let i = 0; i < 8; i++) {
        const currentYear = global._moment().subtract(i, 'year');

        const countForTheTimeframe = global._.find(repartitionData, { key: currentYear.format('YYYY') });
        formattedData.push({
          key: currentYear.startOf('year').format('YYYY'),
          value: countForTheTimeframe ? countForTheTimeframe.value : 0
        });
      }
    }

    formattedDataOrdered = formattedData.reverse();

    const finalData = {
      config: {
        xaxis: [
          { dataKey: 'key' }
        ],
        yaxis: [
          { dataKey: 'value' },
          // { dataKey: 'test', orientation: 'right' }
        ]
      },
      data: formattedDataOrdered
    };

    res.json({ data: finalData });
  }
  else {
    res.json({ data: null });
  }
};