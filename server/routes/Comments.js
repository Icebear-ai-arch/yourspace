const express = require('express');
const { Comment, Post, User } = require('../models');

const router = express.Router();

router.get('/posts/:postId', async (req, res) => {
  const post = await Post.findByPk(req.params.postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  const comments = await Comment.findAll({
    where: { postId: post.id },
    include: [{ model: User, as: 'author', attributes: ['id', 'username', 'profilePictureUrl'] }],
    order: [['createdAt', 'ASC']],
  });
  return res.json(comments);
});

router.post('/posts/:postId', async (req, res) => {
  const post = await Post.findByPk(req.params.postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  if (!body || body.length > 1000) {
    return res.status(400).json({ error: 'Comment must be between 1 and 1000 characters.' });
  }

  const comment = await Comment.create({
    body,
    postId: post.id,
    userId: req.user.id,
  });
  const createdComment = await Comment.findByPk(comment.id, {
    include: [{ model: User, as: 'author', attributes: ['id', 'username', 'profilePictureUrl'] }],
  });
  return res.status(201).json(createdComment);
});

router.patch('/:commentId', async (req, res) => {
  const comment = await Comment.findByPk(req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found.' });
  }
  if (comment.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own comments.' });
  }

  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  if (!body || body.length > 1000) {
    return res.status(400).json({ error: 'Comment must be between 1 and 1000 characters.' });
  }

  await comment.update({ body });
  const updatedComment = await Comment.findByPk(comment.id, {
    include: [{ model: User, as: 'author', attributes: ['id', 'username', 'profilePictureUrl'] }],
  });
  return res.json(updatedComment);
});

router.delete('/:commentId', async (req, res) => {
  const comment = await Comment.findByPk(req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found.' });
  }
  if (comment.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own comments.' });
  }

  await comment.destroy();
  return res.status(204).end();
});

module.exports = router;
