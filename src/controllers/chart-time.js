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
}

const getSequelizeDialect = connection => {
  return connection.options.dialect;
}

const isMySQL = connection => {
  return ['mysql', 'mariadb'].includes(getSequelizeDialect(connection));
};

const isSQLite = connection => {
  return getSequelizeDialect(connection) === 'sqlite';
}

module.exports = async (currentModel, data) => {
  if (!['day', 'week', 'month', 'year'].includes(data.timeframe)) {
    return [ false, '' ];
  }

  let matchReq = {};

  // Day timeframe
  if (data.timeframe === 'day') {
    matchReq = {
      [Op.gte]: new Date(moment().subtract(30, 'day').startOf('day').format()),
      [Op.lte]: new Date(moment().endOf('day').format())
    };
  }
  // Week timeframe
  else if (data.timeframe === 'week') {
    matchReq = {
      [Op.gte]: new Date(moment().subtract(26, 'week').startOf('week').format()),
      [Op.lte]: new Date(moment().endOf('week').format())
    };
  }
  // Month timeframe
  else if (data.timeframe === 'month') {
    matchReq = {
      [Op.gte]: new Date(moment().subtract(12, 'month').startOf('month').format()),
      [Op.lte]: new Date(moment().endOf('month').format())
    };
  }
  // Year timeframe
  else if (data.timeframe === 'year') {
    matchReq = {
      [Op.gte]: new Date(moment().subtract(8, 'year').startOf('year').format()),
      [Op.lte]: new Date(moment().endOf('year').format())
    };
  }

  let groupByElement;

  // MySQL
  if (isMySQL(currentModel.sequelize)) {
    groupByElement = getGroupByFieldFormated_MySQL(currentModel.sequelize, data.timeframe, data.group_by);
  }
  // SQLite
  else if (isSQLite(currentModel.sequelize)) {
    groupByElement = getGroupByFieldFormated_SQLite(currentModel.sequelize, data.timeframe, data.group_by);
  }
  else {
    return [ false, 'Unmanaged database type' ];
  }

  // Query database
  const repartitionData = await currentModel
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

  const formattedData = [];

  // Day timeframe
  if (data.timeframe === 'day') {
    for (let i = 0; i < 30; i++) {
      const currentDate = moment().subtract(i, 'day');

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
      const currentYear = moment().format('YYYY');
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

    for (let i = 0; i < 26; i++) {
      const currentWeek = moment().startOf('isoWeek').subtract(i, 'week');

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
    for (let i = 0; i < 12; i++) {
      const currentMonth = moment().subtract(i, 'month');

      const countForTheTimeframe = _.find(repartitionData, { key: currentMonth.format('YYYY-MM') });
      formattedData.push({
        key: currentMonth.startOf('month').format('MMM'),
        value: countForTheTimeframe ? countForTheTimeframe.value : 0
      });
    }
  }
  // Year timeframe
  else if (data.timeframe === 'year') {
    for (let i = 0; i < 8; i++) {
      const currentYear = moment().subtract(i, 'year');

      const countForTheTimeframe = _.find(repartitionData, { key: currentYear.format('YYYY') });
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

  return [ true, finalData ];
};