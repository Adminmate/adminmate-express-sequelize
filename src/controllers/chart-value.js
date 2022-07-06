const { Op } = require('sequelize');
const Joi = require('joi');

module.exports = _conf => {
  const fnHelper = require('../helpers/functions')(_conf);

  const chartValue = async (currentModel, data) => {
    const sequelizeInstance = currentModel.sequelize;

    const paramsSchema = Joi.object({
      type: Joi.string().required(),
      model: Joi.string().required(),
      operation: Joi.string().required(),
      field: Joi.alternatives().conditional('operation', {
        not: 'count',
        then: Joi.string().required(),
        otherwise: Joi.string()
      }),
      filters: Joi.object({
        operator: Joi.string().valid('and', 'or').required(),
        list: Joi.array().required()
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

    // Filters
    let findParams = {};
    if (data.filters && data.filters.operator && data.filters.list && data.filters.list.length > 0) {
      const filtersQuery = fnHelper.constructQuery(data.filters.list, data.filters.operator, sequelizeInstance);
      if (filtersQuery) {
        findParams = { [Op.and]: filtersQuery };
      }
    }

    try {
      if (data.operation === 'sum' || data.operation === 'avg') {
        // Query database
        const queryData = await currentModel.findAll({
          attributes: [
            [sequelizeInstance.fn(data.operation, sequelizeInstance.col(data.field)), 'queryResult']
          ],
          where: findParams,
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
      const dataCount = await currentModel.count({ where: findParams });

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

  return chartValue;
};
