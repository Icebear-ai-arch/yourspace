const bcrypt = require('bcryptjs');
const express = require('express');
const { User } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const { uploadProfilePicture, removeMedia } = require('../utils/media');

const router = express.Router();

function publicUser(user) {
  const { passwordHash, ...safeUser } = user.get({ plain: true });
  return { ...safeUser, profilePictureUrl: safeUser.profilePictureUrl || null };
}

function saveUserSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) {
        reject(error);
        return;
      }

      req.session.userId = userId;
      req.session.save(saveError => {
        if (saveError) {
          reject(saveError);
          return;
        }
        resolve();
      });
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }

    req.session.destroy(error => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function isUniqueConstraintError(error) {
  return error.name === 'SequelizeUniqueConstraintError';
}

router.post('/register', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (username.length < 3 || username.length > 40) {
    return res.status(400).json({ error: 'Username must be between 3 and 40 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be between 8 and 72 characters.' });
  }

  try {
    const user = await User.create({
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });
    await saveUserSession(req, user.id);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: 'That username or email is already in use.' });
    }
    throw error;
  }
});

router.post('/login', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  await saveUserSession(req, user.id);
  return res.json({ user: publicUser(user) });
});

router.post('/logout', async (req, res) => {
  const userId = req.session && req.session.userId;
  await destroySession(req);
  if (userId) {
    req.app.get('io').in(`user:${userId}`).disconnectSockets(true);
  }
  res.clearCookie('connect.sid');
  return res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch('/profile', requireAuth, async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (username.length < 3 || username.length > 40) {
    return res.status(400).json({ error: 'Username must be between 3 and 40 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  try {
    await req.user.update({ username, email });
    return res.json({ user: publicUser(req.user) });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: 'That username or email is already in use.' });
    }
    throw error;
  }
});

router.patch('/profile-picture', requireAuth, uploadProfilePicture.single('profilePicture'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Choose a profile picture to upload.' });
  }

  const previousFilename = req.user.profilePictureUrl?.split('/').pop();
  try {
    await req.user.update({ profilePictureUrl: `/media/${req.file.filename}` });
  } catch (error) {
    await removeMedia(req.file.filename);
    throw error;
  }

  if (previousFilename) {
    await removeMedia(previousFilename);
  }
  return res.json({ user: publicUser(req.user) });
});

router.delete('/profile-picture', requireAuth, async (req, res) => {
  const previousFilename = req.user.profilePictureUrl?.split('/').pop();
  await req.user.update({ profilePictureUrl: null });
  if (previousFilename) {
    await removeMedia(previousFilename);
  }
  return res.json({ user: publicUser(req.user) });
});

router.delete('/account', requireAuth, async (req, res) => {
  const userId = req.user.id;
  await req.user.destroy();
  await destroySession(req);
  req.app.get('io').in(`user:${userId}`).disconnectSockets(true);
  res.clearCookie('connect.sid');
  return res.status(204).end();
});

module.exports = router;
