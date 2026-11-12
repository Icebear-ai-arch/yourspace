module.exports = (sequelize, DataTypes) => sequelize.define('Conversation', {
  userOneId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userTwoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['userOneId', 'userTwoId'],
    },
  ],
});
