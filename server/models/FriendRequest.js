module.exports = (sequelize, DataTypes) => sequelize.define('FriendRequest', {
  userOneId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userTwoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  requesterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['userOneId', 'userTwoId'],
    },
  ],
});
