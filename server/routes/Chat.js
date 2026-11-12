const express = require('express');
const { Op } = require('sequelize');
const { Conversation, FriendRequest, Message, User } = require('../models');
const { upload, presentMedia, removeMedia } = require('../utils/media');

const router = express.Router();
const participantAttributes = ['id', 'username', 'profilePictureUrl'];

function participantWhere(userId, conversationId) {
  return {
    id: conversationId,
    [Op.or]: [{ userOneId: userId }, { userTwoId: userId }],
  };
}

router.get('/conversations', async (req, res) => {
  const conversations = await Conversation.findAll({
    where: {
      [Op.or]: [{ userOneId: req.user.id }, { userTwoId: req.user.id }],
    },
    include: [
      { model: User, as: 'participantOne', attributes: participantAttributes },
      { model: User, as: 'participantTwo', attributes: participantAttributes },
      {
        model: Message,
        as: 'messages',
        attributes: ['id', 'content', 'mediaType', 'mediaName', 'createdAt'],
        limit: 1,
        separate: true,
        order: [['createdAt', 'DESC']],
      },
    ],
    order: [['updatedAt', 'DESC']],
  });
  return res.json(conversations);
});

router.post('/conversations', async (req, res) => {
  const otherUserId = Number(req.body.userId);
  if (!Number.isInteger(otherUserId) || otherUserId <= 0 || otherUserId === req.user.id) {
    return res.status(400).json({ error: 'Choose another valid user to start a conversation.' });
  }

  const otherUser = await User.findByPk(otherUserId);
  if (!otherUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const userOneId = Math.min(req.user.id, otherUserId);
  const userTwoId = Math.max(req.user.id, otherUserId);
  const friendship = await FriendRequest.findOne({
    where: { userOneId, userTwoId, status: 'accepted' },
  });
  if (!friendship) {
    return res.status(403).json({ error: 'You can start a direct chat after accepting a friend request.' });
  }

  const [conversation] = await Conversation.findOrCreate({
    where: { userOneId, userTwoId },
    defaults: { userOneId, userTwoId },
  });
  const result = await Conversation.findByPk(conversation.id, {
    include: [
      { model: User, as: 'participantOne', attributes: participantAttributes },
      { model: User, as: 'participantTwo', attributes: participantAttributes },
    ],
  });
  return res.status(201).json(result);
});

router.get('/conversations/:conversationId/messages', async (req, res) => {
  const conversation = await Conversation.findOne({
    where: participantWhere(req.user.id, req.params.conversationId),
  });
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  const messages = await Message.findAll({
    where: { conversationId: conversation.id },
    include: [{ model: User, as: 'author', attributes: participantAttributes }],
    order: [['createdAt', 'ASC']],
    limit: 200,
  });
  return res.json(messages.map(presentMedia));
});

router.post('/conversations/:conversationId/messages', upload.single('media'), async (req, res) => {
  const conversation = await Conversation.findOne({
    where: participantWhere(req.user.id, req.params.conversationId),
  });
  if (!conversation) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if ((!content && !req.file) || content.length > 4000) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(400).json({ error: 'Add a message or an attachment; text must be 4000 characters or fewer.' });
  }

  try {
    const message = await Message.create({
      content,
      conversationId: conversation.id,
      userId: req.user.id,
      mediaPath: req.file ? req.file.filename : null,
      mediaType: req.file ? req.file.mimetype : null,
      mediaName: req.file ? req.file.originalname.slice(0, 255) : null,
    });
    const createdMessage = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'author', attributes: participantAttributes }],
    });

    const formattedMessage = presentMedia(createdMessage);
    const io = req.app.get('io');
    io.to(`conversation:${conversation.id}`).emit('message:new', formattedMessage);
    await conversation.update({ updatedAt: new Date() });
    return res.status(201).json(formattedMessage);
  } catch (error) {
    if (req.file) {
      await removeMedia(req.file.filename);
    }
    throw error;
  }
});

module.exports = { router, participantWhere };
