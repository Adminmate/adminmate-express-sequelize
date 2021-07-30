const fnHelper = require('../helpers/functions');
const chartPie = require('./chart-pie');
const chartValue = require('./chart-value');
const chartTime = require('./chart-time');
const chartRanking = require('./chart-ranking');

module.exports.customQuery = async (req, res) => {
  const data = req.body.data;
  const modelName = data.model;

  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return res.status(403).json({ message: 'Invalid request' });
  }

  let result = [ false, '' ];

  switch(data.type) {
    case 'pie':
      result = await chartPie(currentModel, data);
      break;

    case 'single_value':
    case 'objective':
      result = await chartValue(currentModel, data);
      break;

    case 'bar':
    case 'line':
      result = await chartTime(currentModel, data);
      break;

    case 'ranking':
      result = await chartRanking(currentModel, data);
      break;
  }

  // Response
  if (result[0] === true) {
    return res.json({ data: result[1] });
  }
  return res.status(403).json({ message: result[1] || 'Invalid request' });
};