const User = require('../models/User');

const authController = {
  // Регистрация пользователя
  register: async (req, res) => {
    try {
      console.log('Получен запрос на регистрацию:', req.body);
      const { username, email, password } = req.body;

      // Проверка наличия всех необходимых полей
      if (!username || !email || !password) {
        console.log('Отсутствуют обязательные поля:', { username: !!username, email: !!email, password: !!password });
        return res.status(400).json({
          message: 'Все поля обязательны для заполнения'
        });
      }

      // Проверка существования пользователя
      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      if (userExists) {
        console.log('Пользователь уже существует:', { email: userExists.email === email, username: userExists.username === username });
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

      try {
        await user.save();
        console.log('Пользователь успешно создан:', { id: user._id, username: user.username });
      } catch (saveError) {
        console.error('Ошибка при сохранении пользователя:', saveError);
        if (saveError.name === 'ValidationError') {
          return res.status(400).json({
            message: 'Ошибка валидации',
            errors: Object.values(saveError.errors).map(err => err.message)
          });
        }
        throw saveError;
      }

      // Проверка наличия JWT_SECRET
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET не установлен');
        return res.status(500).json({ message: 'Ошибка конфигурации сервера' });
      }

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
      console.error('Ошибка при регистрации:', error);
      res.status(500).json({ 
        message: 'Ошибка при регистрации пользователя',
        error: error.message 
      });
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