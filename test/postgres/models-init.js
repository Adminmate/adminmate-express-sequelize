'use strict';

const Sequelize = require('sequelize');
const db = {};

const sequelize = new Sequelize('postgres://demo:demo@localhost:5432/demo', {
  logging: false
});

db.users = require('./users.js')(sequelize, Sequelize.DataTypes);
db.cars = require('./cars.js')(sequelize, Sequelize.DataTypes);

db.users.associate(db);
db.cars.associate(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
