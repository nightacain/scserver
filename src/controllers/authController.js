const User = require('../models/User');

const authController = {
  // Регистрация пользователя
  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Проверка существования пользователя
      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      if (userExists) {
        return res.status(400).json({
          message: userExists.email === email 
            ? 'Пользователь с таким email уже существует' 
            : 'Пользователь с таким именем уже существует'
        });
      }

      // Создание нового пользователя
      const user = new User({
        username,
        email,
        password
      });

      await user.save();

      // Генерация токена
      const token = user.generateAuthToken();

      res.status(201).json({
        message: 'Регистрация успешна',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Вход пользователя
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Поиск пользователя
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Неверный email или пароль' });
      }

      // Проверка пароля
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Неверный email или пароль' });
      }

      // Генерация токена
      const token = user.generateAuthToken();

      res.json({
        message: 'Вход выполнен успешно',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Получение профиля пользователя
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = authController; 