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

const app = express();
const httpServer = createServer(app);

// Настройка CORS для разных окружений
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "https://your-app-name.vercel.app", // Добавьте URL вашего клиента на Vercel
  "https://your-app-name.netlify.app"  // Добавьте URL вашего клиента на Netlify
];

// Настройка Socket.IO с CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'] // Поддержка WebSocket и long-polling
});

// Настройка CORS для Express
app.use(cors({
  origin: function(origin, callback) {
    // Разрешаем запросы без origin (например, от мобильных приложений)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Routes
app.use('/api', gameRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shadow-checkers';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

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

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 