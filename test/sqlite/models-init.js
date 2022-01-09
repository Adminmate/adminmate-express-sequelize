'use strict';

const Sequelize = require('sequelize');
const db = {};

const sequelize = new Sequelize('demo', 'demo', 'demo', {
  logging: false,
  dialect: 'sqlite',
  storage: './test/sqlite/database.sqlite'
});

db.users = require('./users.js')(sequelize, Sequelize.DataTypes);
db.cars = require('./cars.js')(sequelize, Sequelize.DataTypes);

db.users.associate(db);
db.cars.associate(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
