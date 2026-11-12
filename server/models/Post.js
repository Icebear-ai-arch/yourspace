module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Post', {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postText: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
};