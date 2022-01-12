const _ = require('lodash');
const moment = require('moment');
const strftime = require('strftime');
const { Op } = require('sequelize');

const getGroupByFieldFormated_SQLite = (sequelizeObject, timerange, groupByDateField) => {
  switch (timerange) {
    case 'day': {
      return sequelizeObject.fn('STRFTIME', '%Y-%m-%d', sequelizeObject.col(groupByDateField));
    }
    case 'week': {
      return sequelizeObject.fn('STRFTIME', '%Y-%W', sequelizeObject.col(groupByDateField));
    }
    case 'month': {
      return sequelizeObject.fn('STRFTIME', '%Y-%m', sequelizeObject.col(groupByDateField));
    }
    case 'year': {
      return sequelizeObject.fn('STRFTIME', '%Y', sequelizeObject.col(groupByDateField));
    }
    default:
      return null;
  }
};

const getGroupByFieldFormated_MySQL = (sequelizeObject, timerange, groupByDateField) => {
  const groupByDateFieldFormated = `\`${groupByDateField.replace('.', '`.`')}\``;
  switch (timerange) {
    case 'day': {
      return sequelizeObject.fn('DATE_FORMAT', sequelizeObject.col(groupByDateField), '%Y-%m-%d');
    }
    case 'week': {
      return sequelizeObject.literal(`DATE_FORMAT(DATE_SUB(${groupByDateFieldFormated}, INTERVAL ((7 + WEEKDAY(${groupByDateFieldFormated})) % 7) DAY), '%Y-%v')`);
    }
    case 'month': {
      return sequelizeObject.fn('DATE_FORMAT', sequelizeObject.col(groupByDateField), '%Y-%m');
    }
    case 'year': {
      return sequelizeObject.fn('DATE_FORMAT', sequelizeObject.col(groupByDateField), '%Y');
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

const isSQLite = connection => {
  return getSequelizeDialect(connection) === 'sqlite';
}

module.exports = async (currentModel, data) => {
  if (!['day', 'week', 'month', 'year'].includes(data.timeframe)) {
    return {
      success: false,
      message: 'Invalid timeframe'
    };
  }

  // To set the max date
  const toDate = data.to ? moment(data.to) : moment();

  let matchReq = {};

  // Day timeframe
  if (data.timeframe === 'day') {
    const startOfCurrentDay = toDate.startOf('day');
    matchReq = {
      [Op.gte]: new Date(startOfCurrentDay.clone().subtract(30, 'day').startOf('day').format()),
      [Op.lt]: new Date(startOfCurrentDay.format())
    };
  }
  // Week timeframe
  else if (data.timeframe === 'week') {
    const startOfCurrentWeek = toDate.startOf('week');
    matchReq = {
      [Op.gte]: new Date(startOfCurrentWeek.clone().subtract(26, 'week').startOf('week').format()),
      [Op.lt]: new Date(startOfCurrentWeek.format())
    };
  }
  // Month timeframe
  else if (data.timeframe === 'month') {
    const startOfCurrentMonth = toDate.startOf('month');
    matchReq = {
      [Op.gte]: new Date(startOfCurrentMonth.clone().subtract(12, 'month').startOf('month').format()),
      [Op.lt]: new Date(startOfCurrentMonth.format())
    };
  }
  // Year timeframe
  else if (data.timeframe === 'year') {
    const startOfCurrentYear = toDate.startOf('year');
    matchReq = {
      [Op.gte]: new Date(startOfCurrentYear.clone().subtract(8, 'year').startOf('year').format()),
      [Op.lt]: new Date(startOfCurrentYear.format())
    };
  }

  let groupByElement;

  // MySQL
  if (isMySQL(currentModel.sequelize)) {
    groupByElement = getGroupByFieldFormated_MySQL(currentModel.sequelize, data.timeframe, data.group_by);
  }
  else if (isPostgres(currentModel.sequelize)) {
    groupByElement = getGroupByFieldFormated_PostgreSQL(currentModel.sequelize, data.timeframe, data.group_by);
  }
  // SQLite
  else if (isSQLite(currentModel.sequelize)) {
    groupByElement = getGroupByFieldFormated_SQLite(currentModel.sequelize, data.timeframe, data.group_by);
  }
  else {
    return {
      success: false,
      message: 'Unmanaged database type'
    };
  }

  // Query database
  let repartitionData = await currentModel
    .findAll({
      attributes: [
        [ groupByElement, 'key' ],
        [ currentModel.sequelize.fn(data.operation, currentModel.sequelize.col(data.field)), 'value' ]
      ],
      group: 'key',
      where: {
        [data.group_by]: matchReq
      },
      raw: true
    });

  // Special parsing for PostgreSQL
  if (isPostgres(currentModel.sequelize)) {
    if (data.timeframe === 'day') {
      repartitionData = repartitionData.map(d => ({
        key: d.key.substring(0, 10),
        value: parseFloat(d.value)
      }));
    }
    else if (data.timeframe === 'week') {
      repartitionData = repartitionData.map(d => {
        const isoWeek = moment(d.key).isoWeek();
        const year = moment(d.key).format('YYYY');
        return {
          key: `${year}-${isoWeek}`,
          value: parseFloat(d.value)
        };
      });
    }
    else if (data.timeframe === 'month') {
      repartitionData = repartitionData.map(d => ({
        key: d.key.substring(0, 7),
        value: parseFloat(d.value)
      }));
    }
    else if (data.timeframe === 'year') {
      repartitionData = repartitionData.map(d => ({
        key: d.key.substring(0, 4),
        value: parseFloat(d.value)
      }));
    }
  }

  const formattedData = [];

  // Day timeframe
  if (data.timeframe === 'day') {
    for (let i = 1; i <= 30; i++) {
      const currentDate = toDate.clone().subtract(i, 'day').startOf('day');
      const countForTheTimeframe = _.find(repartitionData, { key: currentDate.format('YYYY-MM-DD') });
      formattedData.push({
        key: currentDate.format('DD/MM'),
        value: countForTheTimeframe ? countForTheTimeframe.value : 0
      });
    }
  }
  // Week timeframe
  else if (data.timeframe === 'week') {
    let chartData = repartitionData;

    // Special treatment for sqlite
    // %W for strftime can be 00 and have no unix week equivalent
    if (isSQLite(currentModel.sequelize)) {
      const currentYear = toDate.format('YYYY');
      const previousYear = currentYear - 1;
      const findWeek0 = chartData.find(d => d.key === currentYear + '-00');
      const findWeek52 = chartData.find(d => d.key === previousYear + '-52');
      if (findWeek0) {
        if (findWeek52) {
          findWeek52.value += findWeek0.value;
        }
        else {
          chartData.push({ key: previousYear + '-52', value: findWeek0.value });
        }
      }
    }

    for (let i = 1; i <= 26; i++) {
      const currentWeek = toDate.clone().subtract(i, 'week').startOf('isoWeek');
      const strftimeFormat = strftime('%Y-%W', currentWeek.toDate());
      const momentFormat = currentWeek.format('YYYY-WW');
      const keyValueToCheck = isSQLite(currentModel.sequelize) ? strftimeFormat : momentFormat;
      const countForTheTimeframe = _.find(chartData, { key: keyValueToCheck });

      formattedData.push({
        key: currentWeek.startOf('isoWeek').format('YYYY-MM-DD'),
        value: countForTheTimeframe ? countForTheTimeframe.value : 0
      });
    }
  }
  // Month timeframe
  else if (data.timeframe === 'month') {
    for (let i = 1; i <= 12; i++) {
      const currentMonth = toDate.clone().subtract(i, 'month').startOf('month');
      const countForTheTimeframe = _.find(repartitionData, { key: currentMonth.format('YYYY-MM') });
      formattedData.push({
        key: currentMonth.startOf('month').format('MMM'),
        value: countForTheTimeframe ? countForTheTimeframe.value : 0
      });
    }
  }
  // Year timeframe
  else if (data.timeframe === 'year') {
    for (let i = 1; i <= 8; i++) {
      const currentYear = toDate.clone().subtract(i, 'year').startOf('year');
      const countForTheTimeframe = _.find(repartitionData, { key: currentYear.format('YYYY') });
      formattedData.push({
        key: currentYear.startOf('year').format('YYYY'),
        value: countForTheTimeframe ? countForTheTimeframe.value : 0
      });
    }
  }

  formattedDataOrdered = formattedData.reverse();

  const chartConfig = {
    xaxis: [
      { dataKey: 'key' }
    ],
    yaxis: [
      { dataKey: 'value' },
      // { dataKey: 'test', orientation: 'right' }
    ]
  };

  return {
    success: true,
    data: {
      config: chartConfig,
      data: formattedDataOrdered
    }
  };
};