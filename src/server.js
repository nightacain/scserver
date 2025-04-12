// server.js (улучшенная и упрощённая версия)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Импорт маршрутов и сервисов
const gameRoutes = require('./routes/gameRoutes');
const authRoutes = require('./routes/authRoutes');
const matchRoutes = require('./routes/matchRoutes');
const GameSessionManager = require('./services/GameSessionManager');
const matchController = require('./controllers/matchController');

// Проверка переменных окружения
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: переменные окружения не установлены');
  process.exit(1);
}

console.log('🌐 Подключение к MongoDB...');
console.log('MONGODB_URI:', process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//:hidden:@'));

const app = express();
const httpServer = createServer(app);
const publicPath = path.join(__dirname, '../public');

// Разрешённые origin'ы для CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://scserver-1.onrender.com',
  undefined,
  'null'
];

// CORS для Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      console.warn('❌ Socket.IO CORS отклонён:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Express CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('❌ Express CORS отклонён:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.static(publicPath));

// Логгирование
app.use((req, res, next) => {
  const { method, url } = req;
  const origin = req.get('origin') || 'no origin';
  console.log(`➡️ ${method} ${url} (origin: ${origin})`);
  next();
});

// Страницы
app.get('/', (_, res) => res.sendFile(path.join(publicPath, 'index.html')));
app.get('/login', (_, res) => res.sendFile(path.join(publicPath, 'login.html')));
app.get('/register', (_, res) => res.sendFile(path.join(publicPath, 'register.html')));
app.get('/game', (_, res) => res.sendFile(path.join(publicPath, 'game.html')));

// API-маршруты
app.use('/api', gameRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('🔥 Ошибка сервера:', err);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

// Подключение к MongoDB и запуск сервера
const connectAndStart = async (retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔌 Подключение к MongoDB (попытка ${attempt})...`);
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });

      console.log('✅ Успешное подключение к MongoDB');
      const PORT = process.env.PORT || 3000;
      httpServer.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
      return;
    } catch (err) {
      console.error('❌ Ошибка подключения к MongoDB:', err.message);
      if (attempt === retries) process.exit(1);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
};

connectAndStart();
