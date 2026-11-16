module.exports = (sequelize, DataTypes) => sequelize.define('TicTacToeGame', {
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  playerXId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  playerOId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  board: {
    type: DataTypes.STRING(9),
    allowNull: false,
    defaultValue: '.........',
  },
  moveHistory: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
  },
  turnUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'active',
  },
  winnerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  indexes: [{ fields: ['conversationId', 'id'] }, { fields: ['status', 'winnerId'] }],
});
