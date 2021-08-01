const _ = require('lodash');
const moment = require('moment');
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
    for (let i = 0; i < 26; i++) {
      const currentWeek = moment().subtract(i, 'week');

      const countForTheTimeframe = _.find(repartitionData, { key: currentWeek.format('YYYY-WW') });
      formattedData.push({
        key: currentWeek.startOf('week').format('DD/MM'),
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