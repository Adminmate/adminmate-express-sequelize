'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('cars', [
      {
        id: 1,
        name: 'Porsche 356',
        manufacturer: 'Porsche',
        year: 1948,
        userId: 1,
        createdAt: "2021-03-13 23:00:00",
        updatedAt: "2021-03-13 23:00:00"
      },
      {
        id: 2,
        name: 'Porsche 550',
        manufacturer: 'Porsche',
        year: 1953,
        userId: 2,
        createdAt: "2021-03-13 23:00:00",
        updatedAt: "2021-03-13 23:00:00"
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('cars', null, {});
  }
};
