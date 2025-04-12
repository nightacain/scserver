const User = require('../models/User');

// Вспомогательные функции валидации
const validateEmail = (email) => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password.length >= 6;
};

const authController = {
  // Регистрация пользователя
  register: async (req, res) => {
    try {
      console.log('🔍 Тело запроса регистрации:', {
        raw: req.body,
        parsed: {
          ...req.body,
          password: '[СКРЫТО]'
        }
      });

      const { username, email, password } = req.body;

      // Проверка наличия всех необходимых полей
      const validationErrors = {
        username: !username ? 'Отсутствует имя пользователя' : null,
        email: !email ? 'Отсутствует email' : 
               !validateEmail(email) ? 'Неверный формат email' : null,
        password: !password ? 'Отсутствует пароль' : 
                 !validatePassword(password) ? 'Пароль должен быть не менее 6 символов' : null
      };

      const errors = Object.entries(validationErrors)
        .filter(([_, error]) => error !== null)
        .reduce((acc, [field, error]) => ({ ...acc, [field]: error }), {});

      if (Object.keys(errors).length > 0) {
        console.log('❌ Ошибки валидации:', errors);
        return res.status(400).json({
          message: 'Ошибка валидации данных',
          errors
        });
      }

      console.log('✅ Валидация пройдена, проверка существующего пользователя...');

      // Проверка существования пользователя
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: { $regex: new RegExp('^' + username + '$', 'i') } }
        ]
      });

      if (existingUser) {
        const error = {
          message: existingUser.email.toLowerCase() === email.toLowerCase()
            ? 'Пользователь с таким email уже существует'
            : 'Пользователь с таким именем уже существует'
        };
        console.log('❌ Пользователь существует:', error);
        return res.status(400).json(error);
      }

      console.log('✅ Пользователь не существует, создаем нового...');

      // Создание нового пользователя
      const user = new User({
        username,
        email: email.toLowerCase(),
        password
      });

      try {
        console.log('💾 Сохранение пользователя...');
        await user.save();
        console.log('✅ Пользователь успешно создан:', {
          id: user._id,
          username: user.username,
          email: user.email
        });
      } catch (saveError) {
        console.error('❌ Ошибка сохранения:', {
          name: saveError.name,
          code: saveError.code,
          message: saveError.message,
          stack: saveError.stack
        });

        if (saveError.name === 'ValidationError') {
          return res.status(400).json({
            message: 'Ошибка валидации',
            errors: Object.values(saveError.errors).map(err => ({
              field: err.path,
              message: err.message
            }))
          });
        }

        if (saveError.code === 11000) {
          return res.status(400).json({
            message: 'Пользователь с таким email или именем уже существует'
          });
        }

        throw saveError;
      }

      // Генерация токена
      console.log('🔑 Генерация JWT токена...');
      const token = user.generateAuthToken();
      console.log('✅ Токен сгенерирован');

      const response = {
        message: 'Регистрация успешна',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon
        }
      };

      console.log('✅ Отправка успешного ответа:', {
        ...response,
        token: token.substring(0, 10) + '...'
      });

      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Критическая ошибка при регистрации:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      res.status(500).json({ 
        message: 'Ошибка при регистрации пользователя',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Внутренняя ошибка сервера'
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