const { DataTypes } = require('sequelize');

module.exports = async sequelize => {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('Posts');

  if (!columns.userId) {
    await queryInterface.addColumn('Posts', 'userId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  }
};
