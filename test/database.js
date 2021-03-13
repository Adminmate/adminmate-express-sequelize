const dbConfig = {
  HOST: '34.123.145.28',
  USER: 'demo',
  PASSWORD: 'azerty123$',
  DB: 'demo',
  dialect: 'mysql',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

const Sequelize = require('sequelize');
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  },
  // define: {
  //   // timestamps: false, // disable createdAt and updatedAt fields
  //   freezeTableName: true // no table name auto-pluralization
  // }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require('./models/user.js')(sequelize, Sequelize);
db.cars = require('./models/car.js')(sequelize, Sequelize);

db.users.associate(db);
db.cars.associate(db);

module.exports = db;