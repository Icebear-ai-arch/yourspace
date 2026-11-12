module.exports = (sequelize, DataTypes) => sequelize.define('GroupMember', {
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['groupId', 'userId'],
    },
  ],
});
