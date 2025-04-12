const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Создать новую игру
router.post('/games', gameController.createGame);

// Присоединиться к игре
router.post('/games/:gameId/join', gameController.joinGame);

// Получить состояние игры
router.get('/games/:gameId', gameController.getGame);

// Обновить состояние игры
router.put('/games/:gameId', gameController.updateGame);

module.exports = router; 