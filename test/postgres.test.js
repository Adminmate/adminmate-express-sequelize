// see https://stackoverflow.com/questions/46227783/encoding-not-recognized-in-jest-js
require('mysql2/node_modules/iconv-lite').encodingExists('foo');
require('jest-specific-snapshot');

process.env.DIALECT = 'postgres';

const db = require('./postgres/models-init.js');

beforeAll(async () => {
  await db.sequelize.sync({ force: true })
    .then(async () => {
      await db.users.bulkCreate(require('./postgres/data/users.js'));
      await db.cars.bulkCreate(require('./postgres/data/cars.js'));
    });
});

// Init app
require('./postgres/app.js');

// Tests
require('./postgres/tests/model-getall.js');

// Close sequelize connection
afterAll(async () => {
  await db.sequelize.close();
});