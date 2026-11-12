module.exports = (sequelize, DataTypes) => sequelize.define('Comment', {
  body: {
    type: DataTypes.STRING(1000),
    allowNull: false,
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});
