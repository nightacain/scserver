const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Регистрация
router.post('/register', authController.register);

// Вход
router.post('/login', authController.login);

// Получение профиля (защищенный маршрут)
router.get('/profile', auth, authController.getProfile);

module.exports = router; 