const express = require('express');
const router = express.Router();
const { Post, User, Comment } = require('../models');
const { upload, presentMedia, removeMedia } = require('../utils/media');

router.get("/", async (req, res) => {
  const posts = await Post.findAll({
    include: [
      { model: User, as: 'author', attributes: ['id', 'username', 'profilePictureUrl'] },
      {
        model: Comment,
        as: 'comments',
        include: [{ model: User, as: 'author', attributes: ['id', 'username', 'profilePictureUrl'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
  return res.json(posts.map(presentMedia));
});

router.post('/', upload.single('media'), async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const postText = typeof req.body.postText === 'string' ? req.body.postText.trim() : '';
  if ((!postText && !req.file) || postText.length > 255) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(400).json({ error: 'Add post text or an attachment; text must be 255 characters or fewer.' });
  }
  if (title.length > 255) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(400).json({ error: 'Post title must be 255 characters or fewer.' });
  }

  try {
    const post = await Post.create({
      title: title || 'Post',
      postText,
      username: req.user.username,
      userId: req.user.id,
      mediaPath: req.file ? req.file.filename : null,
      mediaType: req.file ? req.file.mimetype : null,
      mediaName: req.file ? req.file.originalname.slice(0, 255) : null,
    });
    const createdPost = await Post.findByPk(post.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'profilePictureUrl'] }],
    });
    return res.status(201).json(presentMedia(createdPost));
  } catch (error) {
    if (req.file) {
      await removeMedia(req.file.filename);
    }
    throw error;
  }
});

router.patch('/:postId', upload.single('media'), async (req, res) => {
  const post = await Post.findByPk(req.params.postId);
  if (!post) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(404).json({ error: 'Post not found.' });
  }
  if (post.userId !== req.user.id) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(403).json({ error: 'You can only edit your own posts.' });
  }

  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const postText = typeof req.body.postText === 'string' ? req.body.postText.trim() : '';
  if ((!postText && !post.mediaPath && !req.file) || postText.length > 255 || title.length > 255) {
    if (req.file) await removeMedia(req.file.filename);
    return res.status(400).json({ error: 'Add post text or an attachment; text must be 255 characters or fewer.' });
  }

  const previousMediaPath = post.mediaPath;
  const updates = { title: title || 'Post', postText };
  if (req.file) {
    updates.mediaPath = req.file.filename;
    updates.mediaType = req.file.mimetype;
    updates.mediaName = req.file.originalname.slice(0, 255);
  }
  try {
    await post.update(updates);
  } catch (error) {
    if (req.file) await removeMedia(req.file.filename);
    throw error;
  }
  if (req.file && previousMediaPath) {
    await removeMedia(previousMediaPath);
  }
  return res.json(presentMedia(post));
});

router.delete('/:postId', async (req, res) => {
  const post = await Post.findByPk(req.params.postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  if (post.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }

  await post.destroy();
  await removeMedia(post.mediaPath);
  return res.status(204).end();
});

module.exports = router;