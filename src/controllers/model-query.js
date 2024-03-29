module.exports = _conf => {
  const fnHelper = require('../helpers/functions')(_conf);
  const chartPie = require('./chart-pie')(_conf);
  const chartValue = require('./chart-value')(_conf);
  const chartTime = require('./chart-time')(_conf);
  const chartRanking = require('./chart-ranking')(_conf);
  const chartMap = require('./chart-map')(_conf);

  const customQuery = async (req, res) => {
    const data = req.body.data;
    const modelName = data.model;

    const currentModel = fnHelper.getModelObject(modelName);
    if (!currentModel) {
      return res.status(403).json({ message: 'Invalid request' });
    }

    let result = {
      success: false,
      message: ''
    };

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

      case 'map_point':
        result = await chartMap(currentModel, data);
        break;
    }

    // Response
    if (result.success === true) {
      return res.json({
        chart: result.data
      });
    }

    res.status(403).json({
      message: result.message || 'Invalid request'
    });
  };

  return customQuery;
};
