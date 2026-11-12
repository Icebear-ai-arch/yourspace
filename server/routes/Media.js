const fs = require('fs');
const path = require('path');
const express = require('express');
const { Op } = require('sequelize');
const { Conversation, GroupMember, GroupMessage, Message, Post, User } = require('../models');
const { uploadDirectory } = require('../utils/media');

const router = express.Router();
const safeFilename = /^[0-9a-f-]{36}\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i;
const imageTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

router.get('/:filename', async (req, res) => {
  const { filename } = req.params;
  if (!safeFilename.test(filename)) {
    return res.status(404).json({ error: 'Media not found.' });
  }

  let mediaType = null;
  const post = await Post.findOne({ where: { mediaPath: filename } });
  if (post) {
    mediaType = post.mediaType;
  }

  if (!mediaType) {
    const profilePicture = await User.findOne({
      attributes: ['id'],
      where: { profilePictureUrl: `/media/${filename}` },
    });
    if (profilePicture) {
      mediaType = imageTypes[path.extname(filename).toLowerCase()];
    }
  }

  if (!mediaType) {
    const message = await Message.findOne({
      where: { mediaPath: filename },
      include: [{
        model: Conversation,
        as: 'conversation',
        required: true,
        where: {
          [Op.or]: [{ userOneId: req.user.id }, { userTwoId: req.user.id }],
        },
      }],
    });
    if (message) {
      mediaType = message.mediaType;
    }
  }

  if (!mediaType) {
    const groupMessage = await GroupMessage.findOne({ where: { mediaPath: filename } });
    if (groupMessage) {
      const membership = await GroupMember.findOne({
        where: { groupId: groupMessage.groupId, userId: req.user.id },
      });
      if (membership) {
        mediaType = groupMessage.mediaType;
      }
    }
  }

  if (!mediaType) {
    return res.status(404).json({ error: 'Media not found.' });
  }

  const filePath = path.join(uploadDirectory, filename);
  try {
    await fs.promises.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Media not found.' });
    }
    throw error;
  }

  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, max-age=3600');
  return res.type(mediaType).sendFile(filePath);
});

module.exports = router;
