module.exports = (sequelize, Sequelize) => {
  const Cars = sequelize.define('cars', {
    name: {
      type: Sequelize.STRING
    },
    model: {
      type: Sequelize.STRING
    },
    year: {
      type: Sequelize.DATE
    }
  }, {
    tableName: 'cars'
  });

  Cars.associate = function(models) {
    Cars.belongsTo(models.users, {
      foreignKey: 'userId',
      as: 'user'
    });
  }

  return Cars;
};