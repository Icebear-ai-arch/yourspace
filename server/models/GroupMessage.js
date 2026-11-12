module.exports = (sequelize, DataTypes) => sequelize.define('GroupMessage', {
  content: {
    type: DataTypes.STRING(4000),
    allowNull: false,
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mediaPath: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  mediaType: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  mediaName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
});
