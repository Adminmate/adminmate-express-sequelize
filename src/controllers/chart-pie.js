module.exports = async (currentModel, data) => {
  const sequelizeInstance = currentModel.sequelize;
  const seqFnField = data.field ? sequelizeInstance.col(data.field) : 1;

  // Query database
  const repartitionData = await currentModel.findAll({
    attributes: [
      [ data.group_by, 'key' ],
      [ sequelizeInstance.fn(data.operation, seqFnField), 'value' ]
    ],
    group: ['key'],
    raw: true
  });

  console.log('====repartitionData', repartitionData);

  return [ true, repartitionData ];
};