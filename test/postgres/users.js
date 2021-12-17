module.exports = (sequelize, Sequelize) => {
  const Users = sequelize.define('users', {
    firstname: {
      type: Sequelize.STRING
    },
    lastname: {
      type: Sequelize.STRING
    },
    birthdate: {
      type: Sequelize.DATE
    },
    rating: {
      type: Sequelize.INTEGER
    }
  }, {
    tableName: 'users',
    timestamps: false,
    createdAt: false,
    updatedAt: false
  });

  Users.associate = function(models) {
    Users.hasMany(models.cars, {
      foreignKey: 'userId',
      as: 'cars'
    });
  }

  return Users;
};