'use strict';

const { Op } = require('sequelize');

// Connect to database
const db = require('./models-init.js');

// Init
const amConfig = {
  projectId: '_',
  secretKey: '_',
  authKey: '_',
  masterPassword: '_',
  devMode: true, // If you want to use the dev version of @adminmate-express-core
  testMode: true, // If you want the Adminmate init to return the api instead of the express js router (for tests purpose)
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
            name: { [Op.like]: '%errari 250 GT%' }
          }
        }
      ]
    }
  ]
};

module.exports = require('../../index.js').init(amConfig);
