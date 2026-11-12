const express = require('express');
const { Op } = require('sequelize');
const { FriendRequest, User } = require('../models');

const router = express.Router();
const userAttributes = ['id', 'username', 'profilePictureUrl'];

router.get('/', async (req, res) => {
  const requests = await FriendRequest.findAll({
    where: {
      [Op.or]: [{ userOneId: req.user.id }, { userTwoId: req.user.id }],
    },
    include: [
      { model: User, as: 'userOne', attributes: userAttributes },
      { model: User, as: 'userTwo', attributes: userAttributes },
    ],
    order: [['createdAt', 'DESC']],
  });

  const friends = [];
  const incomingRequests = [];
  const outgoingRequests = [];
  for (const request of requests) {
    const otherUser = request.userOneId === req.user.id ? request.userTwo : request.userOne;
    if (request.status === 'accepted') {
      friends.push(otherUser);
    } else if (request.requesterId === req.user.id) {
      outgoingRequests.push({ requestId: request.id, user: otherUser });
    } else {
      incomingRequests.push({ requestId: request.id, user: otherUser });
    }
  }

  return res.json({ friends, incomingRequests, outgoingRequests });
});

router.post('/requests', async (req, res) => {
  const targetId = Number(req.body.userId);
  if (!Number.isInteger(targetId) || targetId <= 0 || targetId === req.user.id) {
    return res.status(400).json({ error: 'Choose another valid person.' });
  }

  const target = await User.findByPk(targetId, { attributes: userAttributes });
  if (!target) {
    return res.status(404).json({ error: 'Person not found.' });
  }

  const userOneId = Math.min(req.user.id, targetId);
  const userTwoId = Math.max(req.user.id, targetId);
  const existing = await FriendRequest.findOne({ where: { userOneId, userTwoId } });
  if (existing?.status === 'accepted') {
    return res.status(409).json({ error: 'You are already friends.' });
  }
  if (existing?.status === 'pending') {
    return res.status(409).json({
      error: existing.requesterId === req.user.id
        ? 'Friend request already sent.'
        : 'This person already sent you a request. Accept it in your incoming requests.',
    });
  }

  const request = await FriendRequest.create({
    userOneId,
    userTwoId,
    requesterId: req.user.id,
    status: 'pending',
  });
  req.app.get('io').to(`user:${targetId}`).emit('friend:request:new');
  return res.status(201).json({ requestId: request.id, user: target });
});

router.post('/requests/:requestId/accept', async (req, res) => {
  const request = await FriendRequest.findByPk(req.params.requestId);
  if (!request || request.status !== 'pending') {
    return res.status(404).json({ error: 'Pending friend request not found.' });
  }
  if (request.requesterId === req.user.id) {
    return res.status(403).json({ error: 'You cannot accept a request you sent.' });
  }

  const recipientId = request.userOneId === request.requesterId
    ? request.userTwoId
    : request.userOneId;
  if (recipientId !== req.user.id) {
    return res.status(404).json({ error: 'Pending friend request not found.' });
  }

  await request.update({ status: 'accepted' });
  const friend = await User.findByPk(request.requesterId, { attributes: userAttributes });
  req.app.get('io').to(`user:${request.requesterId}`).emit('friend:request:accepted');
  return res.json({ friend });
});

router.delete('/requests/:requestId', async (req, res) => {
  const request = await FriendRequest.findByPk(req.params.requestId);
  if (!request || request.status !== 'pending') {
    return res.status(404).json({ error: 'Pending friend request not found.' });
  }
  if (request.userOneId !== req.user.id && request.userTwoId !== req.user.id) {
    return res.status(404).json({ error: 'Pending friend request not found.' });
  }

  const otherUserId = request.userOneId === req.user.id ? request.userTwoId : request.userOneId;
  await request.destroy();
  req.app.get('io').to(`user:${otherUserId}`).emit('friend:request:updated');
  return res.status(204).end();
});

router.delete('/:friendId', async (req, res) => {
  const friendId = Number(req.params.friendId);
  if (!Number.isInteger(friendId) || friendId <= 0 || friendId === req.user.id) {
    return res.status(400).json({ error: 'Invalid friend.' });
  }

  const userOneId = Math.min(req.user.id, friendId);
  const userTwoId = Math.max(req.user.id, friendId);
  const friendship = await FriendRequest.findOne({
    where: { userOneId, userTwoId, status: 'accepted' },
  });
  if (!friendship) {
    return res.status(404).json({ error: 'Friend not found.' });
  }

  await friendship.destroy();
  req.app.get('io').to(`user:${friendId}`).emit('friend:request:updated');
  return res.status(204).end();
});

module.exports = router;
