const express = require('express');
const { Op } = require('sequelize');
const { User } = require('../models');

const router = express.Router();

router.get('/', async (req, res) => {
  const users = await User.findAll({
    attributes: ['id', 'username', 'profilePictureUrl'],
    where: { id: { [Op.ne]: req.user.id } },
    order: [['username', 'ASC']],
  });
  return res.json(users);
});

module.exports = router;
