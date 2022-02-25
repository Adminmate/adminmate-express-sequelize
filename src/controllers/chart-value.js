const Joi = require('@hapi/joi');
const fnHelper = require('../helpers/functions');

module.exports = async (currentModel, data) => {
  const sequelizeInstance = currentModel.sequelize;

  const paramsSchema = Joi.object({
    type: Joi.string().required(),
    model: Joi.string().required(),
    operation: Joi.string().required(),
    field: Joi.alternatives().conditional('operation', {
      not: 'count',
      then: Joi.string().required(),
      otherwise: Joi.string()
    })
  });

  // Validate params
  const { error } = paramsSchema.validate(data);
  if (error) {
    return {
      success: false,
      message: error.details[0].message
    };
  }

  try {
    if (data.operation === 'sum' || data.operation === 'avg') {
      // Query database
      const queryData = await currentModel.findAll({
        attributes: [
          [sequelizeInstance.fn(data.operation, sequelizeInstance.col(data.field)), 'queryResult']
        ],
        raw: true
      });

      if (!queryData || !queryData[0] || !queryData[0].queryResult) {
        return {
          success: false,
          message: ''
        };
      }

      const safeNumberOrFloat = fnHelper.toFixedIfNecessary(queryData[0].queryResult, 2);

      return {
        success: true,
        data: {
          config: null,
          data: safeNumberOrFloat
        }
      };
    }

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
  catch(e) {
    return {
      success: false,
      message: e.message
    };
  }
};
