const { init, isAuthorized } = require(global.AM_DEV_MODE ? '../adminmate-express-core' : 'adminmate-express-core');

// Controllers
const modelsController = require('./src/controllers/models');
const customActionsController = require('./src/controllers/customactions');
const segmentsController = require('./src/controllers/segments');

// CRUD
const { getAll } = require('./src/controllers/model-getall');
const { getAutocomplete } = require('./src/controllers/model-autocomplete');
const { getOne } = require('./src/controllers/model-getone');
const { postOne } = require('./src/controllers/model-postone');
const { putOne } = require('./src/controllers/model-putone');
const { deleteSome } = require('./src/controllers/model-deletesome');
const { customQuery } = require('./src/controllers/model-query');

const Adminmate = ({ projectId, secretKey, authKey, masterPassword, models, authorizedIps }) => {
  const api = {
    // General
    getModels: modelsController.getAll,
    getModelsProperties: modelsController.getAllProperties,

    // Custom actions
    getCustomActions: customActionsController.getAll,
    getCustomAction: customActionsController.getMatching,

    // Segments
    getSegments: segmentsController.getAll,

    // CRUD
    modelGetAll: getAll,
    modelGetAutocomplete: getAutocomplete,
    modelGetOne: getOne,
    modelPostOne: postOne,
    modelPutOne: putOne,
    modelDeleteSome: deleteSome,
    modelCustomQuery: customQuery
  };

  return init({
    projectId,
    secretKey,
    authKey,
    masterPassword,
    models,
    authorizedIps,
    api
  });
};

module.exports = {
  init: Adminmate,
  isAuthorized
};