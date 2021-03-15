'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('users', [
      {
        id: 1,
        firstname: "John",
        lastname: "Doe",
        birthdate: "2021-03-13 22:49:15",
        rating: 4,
        createdAt: "2021-03-13 22:49:15",
        updatedAt: "2021-03-13 22:49:15"
      },
      {
        id: 2,
        firstname: "Maria",
        lastname: "Doe",
        birthdate: "2021-03-13 22:49:15",
        rating: 5,
        createdAt: "2021-03-13 22:49:15",
        updatedAt: "2021-03-13 22:49:15"
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};
