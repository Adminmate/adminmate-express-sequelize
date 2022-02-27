const Joi = require('@hapi/joi');

module.exports = async (currentModel, data) => {
  const sequelizeInstance = currentModel.sequelize;

  const paramsSchema = Joi.object({
    type: Joi.string().required(),
    model: Joi.string().required(),
    operation: Joi.string().required(),
    group_by: Joi.string().required(),
    field: Joi.alternatives().conditional('operation', {
      not: 'count',
      then: Joi.string().required(),
      otherwise: Joi.string().optional()
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

  try {
    const seqFnField = data.field ? sequelizeInstance.col(data.field) : 1;

    // Query database
    const repartitionData = await currentModel.findAll({
      attributes: [
        [ data.group_by, 'key' ],
        [ sequelizeInstance.fn(data.operation, seqFnField), 'value' ]
      ],
      group: ['key'],
      order: sequelizeInstance.literal('value DESC'),
      limit: data.limit || 15,
      raw: true
    });

    // To make sure value attribute is an integer/float
    const cleanData = repartitionData.map(data => ({
      ...data,
      value: parseFloat(data.value)
    }));

    return {
      success: true,
      data: {
        config: null,
        data: cleanData
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
