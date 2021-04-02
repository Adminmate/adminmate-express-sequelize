'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('users', [
      {
        id: 1,
        firstname: "John",
        lastname: "Doe",
        birthdate: "2021-04-02 00:00:00",
        rating: 4,
        createdAt: "2021-04-02 00:00:00",
        updatedAt: "2021-04-02 00:00:00"
      },
      {
        id: 2,
        firstname: "Maria",
        lastname: "Doe",
        birthdate: "2021-04-02 00:00:00",
        rating: 5,
        createdAt: "2021-04-02 00:00:00",
        updatedAt: "2021-04-02 00:00:00"
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};
