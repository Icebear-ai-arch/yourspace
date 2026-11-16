const express = require('express');
const { Op } = require('sequelize');
const {
  Conversation,
  TicTacToeGame,
  User,
  sequelize,
} = require('../models');
const { participantWhere } = require('./Chat');
const { applyMove } = require('../utils/ticTacToe');

const router = express.Router();
const playerAttributes = ['id', 'username'];

async function findConversation(conversationId, userId, transaction) {
  const id = Number(conversationId);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: { status: 400, message: 'Invalid conversation.' } };
  }

  const conversation = await Conversation.findOne({
    where: participantWhere(userId, id),
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });
  return conversation
    ? { conversation }
    : { error: { status: 404, message: 'Conversation not found.' } };
}

async function latestGame(conversationId, transaction) {
  return TicTacToeGame.findOne({
    where: { conversationId },
    include: [
      { model: User, as: 'playerX', attributes: playerAttributes },
      { model: User, as: 'playerO', attributes: playerAttributes },
      { model: User, as: 'winner', attributes: playerAttributes },
    ],
    order: [['id', 'DESC']],
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });
}

function presentGame(game) {
  if (!game) return null;
  return {
    id: game.id,
    board: game.board.split(''),
    playerXId: game.playerXId,
    playerOId: game.playerOId,
    turnUserId: game.turnUserId,
    status: game.status,
    winnerId: game.winnerId,
    playerX: game.playerX,
    playerO: game.playerO,
    winner: game.winner,
  };
}

async function leaderboard() {
  const scores = await TicTacToeGame.findAll({
    attributes: ['winnerId', [sequelize.fn('COUNT', sequelize.col('id')), 'wins']],
    where: { status: 'won' },
    group: ['winnerId'],
    order: [[sequelize.literal('wins'), 'DESC'], ['winnerId', 'ASC']],
    limit: 10,
    raw: true,
  });
  if (!scores.length) return [];

  const users = await User.findAll({
    where: { id: { [Op.in]: scores.map(score => score.winnerId) } },
    attributes: playerAttributes,
    raw: true,
  });
  const usersById = new Map(users.map(user => [user.id, user]));
  return scores
    .filter(score => usersById.has(score.winnerId))
    .map(score => ({
      userId: score.winnerId,
      username: usersById.get(score.winnerId).username,
      wins: Number(score.wins),
    }));
}

async function gameData(conversationId) {
  const [game, scores] = await Promise.all([
    latestGame(conversationId),
    leaderboard(),
  ]);
  return { game: presentGame(game), leaderboard: scores };
}

router.get('/tic-tac-toe/:conversationId', async (req, res) => {
  const result = await findConversation(req.params.conversationId, req.user.id);
  if (result.error) {
    return res.status(result.error.status).json({ error: result.error.message });
  }
  return res.json(await gameData(result.conversation.id));
});

router.post('/tic-tac-toe/:conversationId', async (req, res) => {
  const result = await sequelize.transaction(async transaction => {
    const access = await findConversation(req.params.conversationId, req.user.id, transaction);
    if (access.error) return access;

    const currentGame = await latestGame(access.conversation.id, transaction);
    if (currentGame && currentGame.status !== 'won') {
      return { error: { status: 409, message: 'Finish the current game before starting another.' } };
    }

    await TicTacToeGame.create({
      conversationId: access.conversation.id,
      playerXId: access.conversation.userOneId,
      playerOId: access.conversation.userTwoId,
      turnUserId: access.conversation.userOneId,
    }, { transaction });
    return { conversationId: access.conversation.id };
  });

  if (result.error) {
    return res.status(result.error.status).json({ error: result.error.message });
  }
  const data = await gameData(result.conversationId);
  req.app.get('io').to(`conversation:${result.conversationId}`).emit('game:updated', {
    conversationId: result.conversationId,
    ...data,
  });
  return res.status(201).json(data);
});

router.post('/tic-tac-toe/:conversationId/moves', async (req, res) => {
  const cell = req.body && req.body.cell;
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
    return res.status(400).json({ error: 'Choose a valid square.' });
  }

  const result = await sequelize.transaction(async transaction => {
    const access = await findConversation(req.params.conversationId, req.user.id, transaction);
    if (access.error) return access;

    const game = await latestGame(access.conversation.id, transaction);
    if (!game || game.status !== 'active') {
      return { error: { status: 409, message: 'There is no active game.' } };
    }
    if (game.turnUserId !== req.user.id) {
      return { error: { status: 409, message: 'Wait for your turn.' } };
    }
    if (game.board[cell] !== '.') {
      return { error: { status: 400, message: 'That square is already taken.' } };
    }

    await game.update(applyMove(game, req.user.id, cell), { transaction });
    if (game.status === 'won') {
      await access.conversation.update({ updatedAt: new Date() }, { transaction });
    }
    return { conversationId: access.conversation.id };
  });

  if (result.error) {
    return res.status(result.error.status).json({ error: result.error.message });
  }
  const data = await gameData(result.conversationId);
  req.app.get('io').to(`conversation:${result.conversationId}`).emit('game:updated', {
    conversationId: result.conversationId,
    ...data,
  });
  return res.json(data);
});

module.exports = router;
