module.exports = (sequelize, Sequelize) => {
  const Cars = sequelize.define('cars', {
    name: {
      type: Sequelize.STRING
    },
    manufacturer: {
      type: Sequelize.STRING
    },
    year: {
      type: Sequelize.INTEGER
    }
  }, {
    tableName: 'cars',
    timestamps: false,
    createdAt: false,
    updatedAt: false
  });

  Cars.associate = function(models) {
    Cars.belongsTo(models.users, {
      foreignKey: 'userId',
      as: 'user'
    });
  }

  return Cars;
};