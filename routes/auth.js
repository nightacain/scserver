const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Регистрация нового пользователя
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Проверяем, существует ли пользователь
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Пользователь уже существует' });
        }

        // Создаем нового пользователя
        user = new User({
            username,
            password: await bcrypt.hash(password, 10)
        });

        await user.save();

        // Создаем JWT токен
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            message: 'Пользователь успешно зарегистрирован'
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Вход пользователя
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Проверяем существование пользователя
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Неверное имя пользователя или пароль' });
        }

        // Проверяем пароль
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Неверное имя пользователя или пароль' });
        }

        // Создаем JWT токен
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            message: 'Вход выполнен успешно'
        });
    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router; 