const fnHelper = require('../helpers/functions');

module.exports.getAllProperties = (req, res) => {
  const modelsProperties = [];

  global._amConfig.models.forEach(modelConfig => {
    const modelProperties = fnHelper.getModelProperties(modelConfig.model);
    modelProperties.map(property => {
      modelsProperties.push({
        model: modelConfig.slug,
        path: property.path
      });
    });
  });

  res.json({ properties: modelsProperties });
};

module.exports.getAll = (req, res) => {
  let models = [];

  global._amConfig.models.forEach(modelConfig => {
    const modelObject = {
      slug: modelConfig.slug,
      properties: fnHelper.getModelProperties(modelConfig.model),
      smart_actions: [],
      segments: []
    };

    // Add smart actions if present
    if (modelConfig.smartActions) {
      modelObject.smart_actions = modelConfig.smartActions;
    }

    // Add smart actions if present
    if (modelConfig.segments) {
      modelObject.segments = modelConfig.segments.map(segment => ({ label: segment.label, code: segment.code }));
    }

    models.push(modelObject);
  });

  res.json({ models });
};