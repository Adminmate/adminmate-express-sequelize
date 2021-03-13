'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('users', [
      {
        firstname: 'John',
        lastname: 'Doe',
        birthdate: "2021-03-13T22:49:15.000Z",
        rating: 4,
        createdAt: "2021-03-13T22:49:15.000Z",
        updatedAt: "2021-03-13T22:49:15.000Z"
      },
      {
        firstname: 'Maria',
        lastname: 'Doe',
        birthdate: "2021-03-13T22:49:15.000Z",
        rating: 5,
        createdAt: "2021-03-13T22:49:15.000Z",
        updatedAt: "2021-03-13T22:49:15.000Z"
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};
