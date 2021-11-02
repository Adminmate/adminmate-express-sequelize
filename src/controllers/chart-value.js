module.exports = async (currentModel, data) => {
  const sequelizeInstance = currentModel.sequelize;

  if (data.operation === 'sum' || data.operation === 'avg') {
    // Query database
    const queryData = await currentModel.findAll({
      attributes: [
        [sequelizeInstance.fn(data.operation, sequelizeInstance.col(data.field)), 'queryResult']
      ],
      raw: true
    });

    if (!queryData || !queryData[0] || typeof queryData[0].queryResult !== 'number') {
      return {
        success: false,
        message: ''
      };
    }

    return {
      success: true,
      data: {
        config: null,
        data: queryData[0].queryResult
      }
    };
  }
  else {
    // Query database
    const dataCount = await currentModel.count({});

    return {
      success: true,
      data: {
        config: null,
        data: dataCount
      }
    };
  }
};