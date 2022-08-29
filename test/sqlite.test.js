// see https://stackoverflow.com/questions/46227783/encoding-not-recognized-in-jest-js
require('mysql2/node_modules/iconv-lite').encodingExists('foo');
require('jest-specific-snapshot');

const db = require('./sqlite/models-init.js');

beforeAll(async () => {
  await db.sequelize.sync({ force: true })
    .then(async () => {
      await db.users.bulkCreate(require('./common/data/users.js'));
      await db.cars.bulkCreate(require('./common/data/cars.js'));
    });
});

// Init app
const api = require('./sqlite/app.js');

// Tests
require('./common/tests/model-getall.js')(api);
require('./common/tests/model-pk.js')(api);
require('./common/tests/model-query.js')(api);

// Close sequelize connection
afterAll(async () => {
  await db.sequelize.close();
});