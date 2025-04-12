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
  process.env.CLIENT_URL || "http://localhost:3000",
  "https://your-app-name.vercel.app",
  "https://your-app-name.netlify.app"
];

// Настройка Socket.IO с CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Настройка CORS для Express
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('CORS отклонен для origin:', origin);
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body);
  next();
});

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/game.html'));
});

// API Routes
app.use('/api', gameRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);

// Catch-all route for SPA
app.get('*', (req, res) => {
  // Если запрос на HTML страницу - отправляем index.html
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
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
      console.log(`Повторная попытка через ${delay/1000} секунд...`);
      setTimeout(() => connectWithRetry(retries - 1, delay), delay);
    } else {
      console.error('Не удалось подключиться к MongoDB после всех попыток');
      process.exit(1);
    }
  });
};

// Start connection process
connectWithRetry();

// Socket.IO middleware для аутентификации
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Хранение времени начала игры
const gameTimes = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.username);

  socket.on('find_game', () => {
    const session = GameSessionManager.addToMatchmaking(socket.userId);
    
    if (session) {
      const { gameId, players } = session;
      gameTimes.set(gameId, Date.now());
      
      Object.keys(players).forEach(playerId => {
        io.to(playerId).emit('game_found', {
          gameId,
          players,
          board: session.board,
          yourColor: players[playerId].color
        });
      });
    } else {
      socket.emit('waiting_for_opponent');
    }
  });

  socket.on('join_game', (gameId) => {
    const session = GameSessionManager.getSession(gameId);
    if (session && session.players[socket.userId]) {
      socket.join(gameId);
      socket.emit('game_state', session);
    }
  });

  socket.on('make_move', ({ gameId, from, to }) => {
    const updatedSession = GameSessionManager.makeMove(gameId, socket.userId, from, to);
    
    if (updatedSession) {
      io.to(gameId).emit('game_state', updatedSession);
    } else {
      socket.emit('invalid_move');
    }
  });

  socket.on('surrender', async (gameId) => {
    const session = GameSessionManager.getSession(gameId);
    if (session && session.players[socket.userId]) {
      session.status = 'finished';
      session.winner = Object.keys(session.players).find(id => id !== socket.userId);

      try {
        const startTime = gameTimes.get(gameId);
        const duration = Math.floor((Date.now() - startTime) / 1000);
        
        await matchController.createMatch({
          winner: session.winner,
          loser: socket.userId,
          winnerColor: session.players[session.winner].color,
          endReason: 'surrender',
          duration
        });

        gameTimes.delete(gameId);
      } catch (error) {
        console.error('Ошибка при сохранении результатов матча:', error);
      }

      io.to(gameId).emit('game_ended', {
        winner: session.winner,
        reason: 'surrender'
      });
    }
  });

  socket.on('disconnect', async () => {
    const gameId = GameSessionManager.removePlayer(socket.userId);
    if (gameId) {
      const session = GameSessionManager.getSession(gameId);
      
      try {
        const startTime = gameTimes.get(gameId);
        if (startTime) {
          const duration = Math.floor((Date.now() - startTime) / 1000);
          
          await matchController.createMatch({
            winner: session.winner,
            loser: socket.userId,
            winnerColor: session.players[session.winner].color,
            endReason: 'disconnect',
            duration
          });

          gameTimes.delete(gameId);
        }
      } catch (error) {
        console.error('Ошибка при сохранении результатов матча:', error);
      }

      io.to(gameId).emit('game_ended', {
        winner: session.winner,
        reason: 'disconnect'
      });
    }
    console.log('User disconnected:', socket.username);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
}); 