'use strict';

const express = require('express');
const plugin = require('../index.js');

const app = express();

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

// Connect to database
// const db = require('./server/database');
// db.sequelize.sync();

// Init
const config = {
  projectId: '6037b459cbb0f63c219789eb',
  secretKey: '7dn6m0zrcsqta5b57hug52xlira4upqdempch65mwy5guehr33vt0r1s8cyrnmko',
  authKey: 'authkey_secret',
  masterPassword: 'demo-password',
  models: [
    {
      slug: 'users',
      //model: db.users,
      smartActions: []
    },
    {
      slug: 'cars',
      //model: db.cars,
      smartActions: []
    }
  ]
};

app.use('/adminmate', plugin.init(config));
// app.use('/adminmate/smartactions', require('./server/routes/adminmate_sa'));
// app.use('/adminmate/custom_api', require('./server/routes/custom_api'));

module.exports = app;