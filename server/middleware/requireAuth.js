const { User } = require('../models');

module.exports = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  const user = await User.findByPk(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Your session is no longer valid. Please log in again.' });
  }

  req.user = user;
  return next();
};
