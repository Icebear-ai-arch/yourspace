const express = require('express');
const { Op } = require('sequelize');
const { FriendRequest, Group, GroupMember, GroupMessage, User, sequelize } = require('../models');
const { upload, presentMedia, removeMedia } = require('../utils/media');

const router = express.Router();
const userAttributes = ['id', 'username', 'profilePictureUrl'];

function groupIncludes() {
  return [
    { model: User, as: 'owner', attributes: userAttributes },
    { model: User, as: 'members', attributes: userAttributes, through: { attributes: [] } },
    {
      model: GroupMessage,
      as: 'messages',
      attributes: ['id', 'content', 'mediaType', 'mediaName', 'createdAt'],
      limit: 1,
      separate: true,
      order: [['createdAt', 'DESC']],
    },
  ];
}

async function findGroupForMember(groupId, userId) {
  const group = await Group.findByPk(groupId);
  if (!group) {
    return null;
  }

  const membership = await GroupMember.findOne({ where: { groupId, userId } });
  return membership ? group : null;
}

function notifyMembers(io, event, group) {
  for (const member of group.members) {
    io.to(`user:${member.id}`).emit(event, group);
  }
}

router.get('/', async (req, res) => {
  const memberships = await GroupMember.findAll({
    attributes: ['groupId'],
    where: { userId: req.user.id },
    raw: true,
  });
  const groupIds = memberships.map(membership => membership.groupId);
  if (groupIds.length === 0) {
    return res.json([]);
  }

  const groups = await Group.findAll({
    where: { id: { [Op.in]: groupIds } },
    include: groupIncludes(),
    order: [['updatedAt', 'DESC']],
  });
  return res.json(groups);
});

router.post('/', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const requestedIds = req.body.memberIds;
  if (!name || name.length > 80) {
    return res.status(400).json({ error: 'Group name must be between 1 and 80 characters.' });
  }
  if (!Array.isArray(requestedIds) || requestedIds.length > 49) {
    return res.status(400).json({ error: 'Choose between 1 and 49 other members.' });
  }

  const otherMemberIds = [...new Set(requestedIds.map(Number))];
  if (otherMemberIds.some(id => !Number.isInteger(id) || id <= 0 || id === req.user.id)) {
    return res.status(400).json({ error: 'Choose valid members other than yourself.' });
  }
  if (otherMemberIds.length === 0) {
    return res.status(400).json({ error: 'Choose at least one other person for the group.' });
  }

  const users = await User.findAll({ where: { id: { [Op.in]: otherMemberIds } } });
  if (users.length !== otherMemberIds.length) {
    return res.status(400).json({ error: 'One or more selected users could not be found.' });
  }
  const friendships = await FriendRequest.findAll({
    attributes: ['id'],
    where: {
      status: 'accepted',
      [Op.or]: [
        { userOneId: req.user.id, userTwoId: { [Op.in]: otherMemberIds } },
        { userTwoId: req.user.id, userOneId: { [Op.in]: otherMemberIds } },
      ],
    },
  });
  if (friendships.length !== otherMemberIds.length) {
    return res.status(403).json({ error: 'You can invite only accepted friends to a group.' });
  }

  const group = await sequelize.transaction(async transaction => {
    const createdGroup = await Group.create({
      name,
      ownerId: req.user.id,
    }, { transaction });
    await GroupMember.bulkCreate(
      [req.user.id, ...otherMemberIds].map(userId => ({ groupId: createdGroup.id, userId })),
      { transaction }
    );
    return createdGroup;
  });

  const result = await Group.findByPk(group.id, { include: groupIncludes() });
  notifyMembers(req.app.get('io'), 'group:created', result);
  return res.status(201).json(result);
});

router.patch('/:groupId', async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(400).json({ error: 'Invalid group.' });
  }

  const group = await findGroupForMember(groupId, req.user.id);
  if (!group) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(404).json({ error: 'Group not found.' });
  }
  if (group.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Only the group creator can rename this chat.' });
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 80) {
    return res.status(400).json({ error: 'Group name must be between 1 and 80 characters.' });
  }

  await group.update({ name, updatedAt: new Date() });
  const result = await Group.findByPk(group.id, { include: groupIncludes() });
  notifyMembers(req.app.get('io'), 'group:renamed', result);
  return res.json(result);
});

router.get('/:groupId/messages', async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return res.status(400).json({ error: 'Invalid group.' });
  }

  const group = await findGroupForMember(groupId, req.user.id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found.' });
  }

  const messages = await GroupMessage.findAll({
    where: { groupId },
    include: [{ model: User, as: 'author', attributes: userAttributes }],
    order: [['createdAt', 'ASC']],
    limit: 200,
  });
  return res.json(messages.map(presentMedia));
});

router.post('/:groupId/messages', upload.single('media'), async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(400).json({ error: 'Invalid group.' });
  }

  const group = await findGroupForMember(groupId, req.user.id);
  if (!group) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(404).json({ error: 'Group not found.' });
  }

  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if ((!content && !req.file) || content.length > 4000) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(400).json({ error: 'Add a message or an attachment; text must be 4000 characters or fewer.' });
  }

  try {
    const message = await GroupMessage.create({
      content,
      groupId,
      userId: req.user.id,
      mediaPath: req.file ? req.file.filename : null,
      mediaType: req.file ? req.file.mimetype : null,
      mediaName: req.file ? req.file.originalname.slice(0, 255) : null,
    });
    const createdMessage = await GroupMessage.findByPk(message.id, {
      include: [{ model: User, as: 'author', attributes: userAttributes }],
    });
    const formattedMessage = presentMedia(createdMessage);
    await group.update({ updatedAt: new Date() });
    req.app.get('io').to(`group:${groupId}`).emit('group:message:new', formattedMessage);
    return res.status(201).json(formattedMessage);
  } catch (error) {
    if (req.file) {
      await removeMedia(req.file.filename);
    }
    throw error;
  }
});

module.exports = router;
