// see https://stackoverflow.com/questions/46227783/encoding-not-recognized-in-jest-js
require('mysql2/node_modules/iconv-lite').encodingExists('foo');
require('jest-specific-snapshot');

const db = require('./postgres/models-init.js');

beforeAll(async () => {
  // Disable foreign keys check
  // await db.sequelize.query(`SET session_replication_role = 'replica'`);
  // Drop everything
  // await db.sequelize.drop();
  // Re-enable foreign keys check
  // await db.sequelize.query(`SET session_replication_role = 'origin'`);
  await db.sequelize.sync({ force: true });
  await db.users.bulkCreate(require('./common/data/users.js'));
  await db.cars.bulkCreate(require('./common/data/cars.js'));
});

// Init app
require('./postgres/app.js');

// Tests
require('./common/tests/model-getall.js');
require('./common/tests/model-pk.js');
require('./common/tests/model-query.js');

// Close sequelize connection
afterAll(async () => {
  await db.sequelize.close();
});