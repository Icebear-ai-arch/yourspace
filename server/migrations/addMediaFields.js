const { DataTypes } = require('sequelize');

const tables = ['Posts', 'Messages', 'GroupMessages'];
const fields = {
  mediaPath: DataTypes.STRING(255),
  mediaType: DataTypes.STRING(50),
  mediaName: DataTypes.STRING(255),
};

module.exports = async sequelize => {
  const queryInterface = sequelize.getQueryInterface();
  for (const table of tables) {
    const columns = await queryInterface.describeTable(table);
    for (const [field, type] of Object.entries(fields)) {
      if (!columns[field]) {
        await queryInterface.addColumn(table, field, { type, allowNull: true });
      }
    }
  }
};
