const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Маршрут для регистрации
router.post('/register', authController.register);

// Маршрут для входа
router.post('/login', authController.login);

// Маршрут для проверки токена
router.get('/verify', auth, (req, res) => {
    res.json({ valid: true });
});

// Маршрут для получения профиля пользователя
router.get('/profile', auth, authController.getProfile);

module.exports = router; 