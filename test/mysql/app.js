'use strict';

const { Op } = require('sequelize');

// If you want to use the dev version of @adminmate-express-core
global.AM_DEV_MODE = true;

// Connect to database
const db = require('./models-init.js');

// Init
const amConfig = {
  projectId: '_',
  secretKey: '_',
  authKey: '_',
  masterPassword: '_',
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

require('../../index.js').init(amConfig);