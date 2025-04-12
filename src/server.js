require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const gameRoutes = require('./routes/gameRoutes');
const authRoutes = require('./routes/authRoutes');
const matchRoutes = require('./routes/matchRoutes');
const GameSessionManager = require('./services/GameSessionManager');
const matchController = require('./controllers/matchController');
const jwt = require('jsonwebtoken');
const path = require('path');

// Проверка наличия необходимых переменных окружения
if (!process.env.JWT_SECRET) {
  console.error('КРИТИЧЕСКАЯ ОШИБКА: JWT_SECRET не установлен');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('КРИТИЧЕСКАЯ ОШИБКА: MONGODB_URI не установлен');
  process.exit(1);
}

console.log('Настройка подключения к MongoDB...');
console.log('MONGODB_URI:', process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//:hidden:@')); // Скрываем пароль в логах

const app = express();
const httpServer = createServer(app);

// Настройка CORS для разных окружений
const allowedOrigins = [
  'http://localhost:3000',           // Локальная разработка
  'http://localhost:5000',           // Альтернативный порт для локальной разработки
  'https://scserver-1.onrender.com', // Продакшен URL
  undefined,                         // Разрешаем запросы без origin (для Postman и curl)
  'null'                            // Для локальных файлов
];

// Настройка Socket.IO с CORS
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Socket.IO CORS отклонен для origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Настройка CORS для Express
app.use(cors({
  origin: (origin, callback) => {
    console.log('🔍 Входящий CORS origin:', { origin: origin || 'no origin' });
    if (!origin || allowedOrigins.includes(origin)) {
      console.log('✅ CORS разрешен для origin:', origin || 'no origin');
      callback(null, true);
    } else {
      console.log('❌ CORS отклонен для origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Парсинг JSON должен быть до middleware логирования
app.use(express.json({
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('❌ Ошибка парсинга JSON:', e.message);
      res.status(400).json({ message: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

// Middleware для логирования запросов
app.use((req, res, next) => {
  const logData = {
    method: req.method,
    url: req.url,
    origin: req.get('origin') || 'no origin',
    contentType: req.get('content-type'),
    headers: {
      'user-agent': req.get('user-agent'),
      'accept': req.get('accept'),
      'accept-encoding': req.get('accept-encoding'),
      'connection': req.get('connection')
    },
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  };
  
  // Не логируем пароли
  if (logData.body && logData.body.password) {
    logData.body = { ...logData.body, password: '[СКРЫТО]' };
  }
  
  console.log('📝 Детали входящего запроса:', JSON.stringify(logData, null, 2));
  next();
});

// Middleware для логирования статических файлов
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    console.log('Запрос статического файла:', req.path);
  }
  next();
});

// Настройка раздачи статических файлов
const publicPath = path.join(__dirname, '../public');
console.log('Путь к публичным файлам:', publicPath);

app.use(express.static(publicPath, {
  index: false, // Отключаем автоматическую отдачу index.html
  extensions: ['html', 'htm'], // Разрешаем доступ к HTML файлам без расширения
  setHeaders: (res, path, stat) => {
    // Устанавливаем правильные заголовки для разных типов файлов
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
    // Отключаем кэширование для разработки
    if (process.env.NODE_ENV === 'development') {
      res.set('Cache-Control', 'no-store');
    }
  }
}));

// Маршруты для HTML страниц
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(publicPath, 'register.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(publicPath, 'game.html'));
});

// API Routes
app.use('/api', gameRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);

// Catch-all route for SPA
app.get('*', (req, res) => {
  // Если запрос на HTML страницу - отправляем index.html
  if (req.accepts('html')) {
    res.sendFile(path.join(publicPath, 'index.html'));
  } else {
    res.status(404).json({ message: 'Not Found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  
  res.status(500).json({
    message: 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// MongoDB connection with retry
const connectWithRetry = (retries = 5, delay = 5000) => {
  console.log(`Попытка подключения к MongoDB (осталось попыток: ${retries})...`);
  
  return mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
  })
  .then(() => {
    console.log('Успешное подключение к MongoDB');
    
    // Start server only after successful database connection
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Ошибка подключения к MongoDB:', err);
    
    if (retries > 0) {
      console.log(`