module.exports = async sequelize => {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('Users');
  if (!columns.profilePictureUrl) {
    const { DataTypes } = require('sequelize');
    await queryInterface.addColumn('Users', 'profilePictureUrl', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  }
};
