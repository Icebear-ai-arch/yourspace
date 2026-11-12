'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const baseConfig = require(__dirname + '/../config/config.json')[env];
const config = {
  ...baseConfig,
  host: process.env.DB_HOST || baseConfig.host,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : baseConfig.port,
  username: process.env.DB_USER || baseConfig.username,
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : baseConfig.password,
  database: process.env.DB_NAME || baseConfig.database,
};
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.User.hasMany(db.Post, { as: 'posts', foreignKey: 'userId', onDelete: 'CASCADE' });
db.Post.belongsTo(db.User, { as: 'author', foreignKey: 'userId' });
db.Post.hasMany(db.Comment, { as: 'comments', foreignKey: 'postId', onDelete: 'CASCADE' });
db.Comment.belongsTo(db.Post, { as: 'post', foreignKey: 'postId' });
db.User.hasMany(db.Comment, { as: 'comments', foreignKey: 'userId', onDelete: 'CASCADE' });
db.Comment.belongsTo(db.User, { as: 'author', foreignKey: 'userId' });
db.User.hasMany(db.Conversation, { as: 'conversationsAsFirst', foreignKey: 'userOneId', onDelete: 'CASCADE' });
db.User.hasMany(db.Conversation, { as: 'conversationsAsSecond', foreignKey: 'userTwoId', onDelete: 'CASCADE' });
db.Conversation.belongsTo(db.User, { as: 'participantOne', foreignKey: 'userOneId' });
db.Conversation.belongsTo(db.User, { as: 'participantTwo', foreignKey: 'userTwoId' });
db.Conversation.hasMany(db.Message, { as: 'messages', foreignKey: 'conversationId', onDelete: 'CASCADE' });
db.Message.belongsTo(db.Conversation, { as: 'conversation', foreignKey: 'conversationId' });
db.User.hasMany(db.Message, { as: 'messages', foreignKey: 'userId', onDelete: 'CASCADE' });
db.Message.belongsTo(db.User, { as: 'author', foreignKey: 'userId' });
db.User.hasMany(db.Group, { as: 'ownedGroups', foreignKey: 'ownerId', onDelete: 'CASCADE' });
db.Group.belongsTo(db.User, { as: 'owner', foreignKey: 'ownerId' });
db.Group.belongsToMany(db.User, {
  as: 'members',
  through: db.GroupMember,
  foreignKey: 'groupId',
  otherKey: 'userId',
});
db.User.belongsToMany(db.Group, {
  as: 'joinedGroups',
  through: db.GroupMember,
  foreignKey: 'userId',
  otherKey: 'groupId',
});
db.Group.hasMany(db.GroupMember, { as: 'memberships', foreignKey: 'groupId', onDelete: 'CASCADE' });
db.GroupMember.belongsTo(db.Group, { as: 'group', foreignKey: 'groupId' });
db.User.hasMany(db.GroupMember, { as: 'groupMemberships', foreignKey: 'userId', onDelete: 'CASCADE' });
db.GroupMember.belongsTo(db.User, { as: 'user', foreignKey: 'userId' });
db.Group.hasMany(db.GroupMessage, { as: 'messages', foreignKey: 'groupId', onDelete: 'CASCADE' });
db.GroupMessage.belongsTo(db.Group, { as: 'group', foreignKey: 'groupId' });
db.User.hasMany(db.GroupMessage, { as: 'groupMessages', foreignKey: 'userId', onDelete: 'CASCADE' });
db.GroupMessage.belongsTo(db.User, { as: 'author', foreignKey: 'userId' });
db.User.hasMany(db.FriendRequest, { as: 'sentFriendRequests', foreignKey: 'requesterId', onDelete: 'CASCADE' });
db.User.hasMany(db.FriendRequest, { as: 'firstFriendRequests', foreignKey: 'userOneId', onDelete: 'CASCADE' });
db.User.hasMany(db.FriendRequest, { as: 'secondFriendRequests', foreignKey: 'userTwoId', onDelete: 'CASCADE' });
db.FriendRequest.belongsTo(db.User, { as: 'requester', foreignKey: 'requesterId' });
db.FriendRequest.belongsTo(db.User, { as: 'userOne', foreignKey: 'userOneId' });
db.FriendRequest.belongsTo(db.User, { as: 'userTwo', foreignKey: 'userTwoId' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
