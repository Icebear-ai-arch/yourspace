module.exports = (sequelize, DataTypes) => sequelize.define('User', {
  username: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(254),
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  profilePictureUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
});
