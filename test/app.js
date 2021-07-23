'use strict';

const express = require('express');
const { Op } = require('sequelize');

// If you want to use the dev version of @adminmate-express-core
global.AM_DEV_MODE = true;

// Create express app
const app = express();

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

// Connect to database
const db = require('../models/index.js');

// Init
const amConfig = {
  projectId: '6037b459cbb0f63c219789eb',
  secretKey: '7dn6m0zrcsqta5b57hug52xlira4upqdempch65mwy5guehr33vt0r1s8cyrnmko',
  authKey: 'authkey_secret',
  masterPassword: 'demo-password',
  models: [
    {
      slug: 'users',
      model: db.users,
      actions: []
    },
    {
      slug: 'cars',
      model: db.cars,
      actions: [
        {
          label: 'Block the car',
          code: 'block_car',
          target: ['item'],
          filter: car => {
            return car.year === 1960
          }
        }
      ],
      segments: [
        {
          label: 'Ferrari',
          code: 'ferrari',
          query: {
            name: { [Op.like]: '%erra%' }
          }
        }
      ]
    }
  ]
};

const plugin = require('../index.js');
app.use(plugin.init(amConfig));

module.exports = app;