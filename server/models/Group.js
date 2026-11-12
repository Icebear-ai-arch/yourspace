module.exports = (sequelize, DataTypes) => sequelize.define('Group', {
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});
