const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const auth = require('../middleware/auth');

// Получение истории матчей пользователя
router.get('/history', auth, matchController.getUserMatches);

// Получение статистики пользователя
router.get('/stats', auth, matchController.getUserStats);

module.exports = router; 