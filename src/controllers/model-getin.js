const fnHelper = require('../helpers/functions');

module.exports.getIn = async (modelName, ids) => {
  const currentModel = fnHelper.getModelObject(modelName);
  if (!currentModel) {
    return null;
  }

  // Get corresponding items
  const items = await currentModel
    .findAll({ id: ids });
    // .catch(e => {
    //   res.status(403).json({ message: e.message });
    // });

  return items;
};