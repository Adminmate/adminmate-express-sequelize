// see https://stackoverflow.com/questions/46227783/encoding-not-recognized-in-jest-js
require('mysql2/node_modules/iconv-lite').encodingExists('foo');
require('jest-specific-snapshot');

process.env.DIALECT = 'mysql';

// Init app
require('./app.js');

require('./tests/model-getall.test.js');
require('./tests/model-query.test.js');

// Close sequelize connection
afterAll(async () => {
  const db = require('../models/index');
  await db.sequelize.close();
});