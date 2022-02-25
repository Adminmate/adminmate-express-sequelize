const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require('moment');
// const strftime = require('strftime');
const { Op } = require('sequelize');

// const getGroupByFieldFormated_SQLite = (sequelizeObject, timerange, groupByDateField) => {
//   switch (timerange) {
//     case 'day': {
//       return sequelizeObject.fn('STRFTIME', '%Y-%m-%d', sequelizeObject.col(groupByDateField));
//     }
//     case 'week': {
//       return sequelizeObject.fn('STRFTIME', '%Y-%W', sequelizeObject.col(groupByDateField));
//     }
//     case 'month': {
//       return sequelizeObject.fn('STRFTIME', '%Y-%m', sequelizeObject.col(groupByDateField));
//     }
//     case 'year': {
//       return sequelizeObject.fn('STRFTIME', '%Y', sequelizeObject.col(groupByDateField));
//     }
//     default:
//       return null;
//   }
// };

const getGroupByFieldFormated_MySQL = (sequelizeObject, timerange, groupByDateField) => {
  const groupByDateFieldFormated = `\`${groupByDateField.replace('.', '`.`')}\``;
  switch (timerange) {
    case 'day': {
      return sequelizeObject.fn('DATE_FORMAT', sequelizeObject.col(groupByDateField), '%Y-%m-%d 00:00:00');
    }
    case 'week': {
      return sequelizeObject.literal(`DATE_FORMAT(DATE_SUB(${groupByDateFieldFormated}, INTERVAL ((7 + WEEKDAY(${groupByDateFieldFormated})) % 7) DAY), '%Y-%m-%d 00:00:00')`);
    }
    case 'month': {
      return sequelizeObject.fn('DATE_FORMAT', sequelizeObject.col(groupByDateField), '%Y-%m-01 00:00:00');
    }
    case 'year': {
      return sequelizeObject.fn('DATE_FORMAT', sequelizeObject.col(groupByDateField), '%Y-01-01 00:00:00');
    }
    default:
      return null;
  }
};

const getGroupByFieldFormated_PostgreSQL = (sequelizeObject, timerange, groupByDateField) => {
  const groupBy = groupByDateField.replace('.', '"."');
  return sequelizeObject.fn('to_char', sequelizeObject.fn(
    'date_trunc',
    timerange,
    sequelizeObject.literal(`"${groupBy}" at time zone 'Europe/Paris'`),
  ), 'YYYY-MM-DD 00:00:00');
};

const getSequelizeDialect = connection => {
  return connection.options.dialect;
};

const isMySQL = connection => {
  return ['mysql', 'mariadb'].includes(getSequelizeDialect(connection));
};

const isPostgres = connection => {
  return ['postgres'].includes(getSequelizeDialect(connection));
};

// const isSQLite = connection => {
//   return getSequelizeDialect(connection) === 'sqlite';
// };

module.exports = async (currentModel, data) => {
  const sequelizeInstance = currentModel.sequelize;

  const paramsSchema = Joi.object({
    type: Joi.string().required(),
    model: Joi.string().required(),
    operation: Joi.string().required(),
    group_by: Joi.string().required(),
    timeframe: Joi.string().required().valid('day', 'week', 'month', 'year'),
    field: Joi.alternatives().conditional('operation', {
      not: 'count',
      then: Joi.string().required(),
      otherwise: Joi.string()
    }),
    limit: Joi.number().optional()
  });

  // Validate params
  const { error } = paramsSchema.validate(data);
  if (error) {
    return {
      success: false,
      message: error.details[0].message
    };
  }

  let groupByElement;

  // MySQL
  if (isMySQL(sequelizeInstance)) {
    groupByElement = getGroupByFieldFormated_MySQL(sequelizeInstance, data.timeframe, data.group_by);
  }
  // PostgreSQL
  else if (isPostgres(sequelizeInstance)) {
    groupByElement = getGroupByFieldFormated_PostgreSQL(sequelizeInstance, data.timeframe, data.group_by);
  }
  // SQLite
  // else if (isSQLite(sequelizeInstance)) {
  //   groupByElement = getGroupByFieldFormated_SQLite(sequelizeInstance, data.timeframe, data.group_by);
  // }
  else {
    return {
      success: false,
      message: 'Unmanaged database type'
    };
  }

  let repartitionData;
  try {
    const seqFnField = data.field ? sequelizeInstance.col(data.field) : 1;
    // Query database
    repartitionData = await currentModel.findAll({
      attributes: [
        [ groupByElement, 'key' ],
        [ sequelizeInstance.fn(data.operation, seqFnField), 'value' ]
      ],
      group: 'key',
      // where: {
      //   [data.group_by]: matchReq
      // },
      raw: true
    });
  }
  catch(e) {
    return {
      success: false,
      message: e.message
    };
  }

  // Get min & max date in the results
  const unixRange = repartitionData.map(data => moment(data.key, 'YYYY-MM-DD HH:mm:ss'));
  const min = _.min(unixRange);
  const max = _.max(unixRange);

  const formattedData = [];
  let currentDate = min;
  while (currentDate.isSameOrBefore(max)) {
    const countForTheTimeframe = repartitionData.find(d => moment(d.key).isSame(currentDate, data.timeframe));
    formattedData.push({
      key: currentDate.format('YYYY-MM-DD'),
      value: countForTheTimeframe ? countForTheTimeframe.value : 0
    });
    currentDate.add(1, data.timeframe).startOf('day');
  }

  const chartConfig = {
    xaxis: [
      { dataKey: 'key' }
    ],
    yaxis: [
      { dataKey: 'value' }
    ]
  };

  return {
    success: true,
    data: {
      config: chartConfig,
      data: formattedData
    }
  };
};
