const express = require('express');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const db = require('./models');
const requireAuth = require('./middleware/requireAuth');
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production.');
}
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const sessionMiddleware = session({
  secret: sessionSecret,
  store: new SequelizeStore({ db: db.sequelize }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  },
});
const io = new Server(server, {
  cors: { origin: clientOrigin, credentials: true },
});

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use(sessionMiddleware);

app.get('/health', async (req, res) => {
  await db.sequelize.authenticate();
  return res.json({ status: 'ok' });
});

app.use('/auth', require('./routes/Auth'));
app.use('/posts', requireAuth, require('./routes/Posts'));
app.use('/comments', requireAuth, require('./routes/Comments'));
app.use('/users', requireAuth, require('./routes/Users'));
app.use('/friends', requireAuth, require('./routes/Friends'));
app.use('/chat', requireAuth, require('./routes/Chat').router);
app.use('/groups', requireAuth, require('./routes/Groups'));
app.use('/media', requireAuth, require('./routes/Media'));

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) {
    return next(error);
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? error.field === 'profilePicture'
        ? 'Profile pictures must be 5 MB or smaller.'
        : 'Media files must be 20 MB or smaller.'
      : error.field === 'profilePicture'
        ? 'Attach only one profile picture at a time.'
        : 'Attach only one media file at a time.';
    return res.status(status).json({ error: message });
  }
  if (error.statusCode === 415) {
    return res.status(415).json({ error: error.message });
  }
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

io.engine.use(sessionMiddleware);
io.use((socket, next) => {
  if (!socket.request.session || !socket.request.session.userId) {
    next(new Error('Authentication required.'));
    return;
  }
  socket.userId = socket.request.session.userId;
  next();
});

io.on('connection', socket => {
  socket.join(`user:${socket.userId}`);

  socket.on('conversation:join', async conversationId => {
    try {
      const { Conversation } = db;
      const { Op } = db.Sequelize;
      const id = Number(conversationId);
      if (!Number.isInteger(id) || id <= 0) {
        socket.emit('chat:error', { error: 'Invalid conversation.' });
        return;
      }

      const conversation = await Conversation.findOne({
        where: {
          id,
          [Op.or]: [{ userOneId: socket.userId }, { userTwoId: socket.userId }],
        },
      });
      if (!conversation) {
        socket.emit('chat:error', { error: 'Conversation not found.' });
        return;
      }
      await socket.join(`conversation:${conversation.id}`);
    } catch (error) {
      console.error('Unable to join chat room:', error);
      socket.emit('chat:error', { error: 'Could not join that conversation.' });
    }
  });

  socket.on('conversation:leave', conversationId => {
    socket.leave(`conversation:${Number(conversationId)}`);
  });

  socket.on('group:join', async groupId => {
    try {
      const { GroupMember } = db;
      const id = Number(groupId);
      if (!Number.isInteger(id) || id <= 0) {
        socket.emit('group:error', { error: 'Invalid group.' });
        return;
      }

      const membership = await GroupMember.findOne({
        where: { groupId: id, userId: socket.userId },
      });
      if (!membership) {
        socket.emit('group:error', { error: 'Group not found.' });
        return;
      }
      await socket.join(`group:${id}`);
    } catch (error) {
      console.error('Unable to join group chat:', error);
      socket.emit('group:error', { error: 'Could not join that group chat.' });
    }
  });

  socket.on('group:leave', groupId => {
    socket.leave(`group:${Number(groupId)}`);
  });
});

app.set('io', io);

async function start() {
  await db.sequelize.authenticate();
  await db.sequelize.sync();
  await require('./migrations/addPostOwner')(db.sequelize);
  await require('./migrations/addMediaFields')(db.sequelize);
  await require('./migrations/addUserProfilePicture')(db.sequelize);
  const port = Number(process.env.PORT) || 3001;
  await new Promise((resolve, reject) => {
    const handleError = error => {
      server.removeListener('listening', handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.removeListener('error', handleError);
      console.log(`Server running on port ${port}`);
      resolve();
    };
    server.once('error', handleError);
    server.once('listening', handleListening);
    server.listen(port);
  });
}

start().catch(error => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
