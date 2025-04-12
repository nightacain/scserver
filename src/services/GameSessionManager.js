class GameSessionManager {
  constructor() {
    this.sessions = new Map(); // gameId -> session
    this.waitingPlayers = new Set(); // players waiting for match
  }

  // Создание новой игровой сессии
  createSession(player1Id, player2Id) {
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      gameId,
      players: {
        [player1Id]: { id: player1Id, color: 'white' },
        [player2Id]: { id: player2Id, color: 'black' }
      },
      board: this.createInitialBoard(),
      currentTurn: player1Id,
      status: 'active'
    };

    this.sessions.set(gameId, session);
    return session;
  }

  // Создание начального состояния доски
  createInitialBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    
    // Расставляем белые шашки
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 8; j++) {
        if ((i + j) % 2 === 1) {
          board[i][j] = { color: 'white', isKing: false };
        }
      }
    }
    
    // Расставляем черные шашки
    for (let i = 5; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if ((i + j) % 2 === 1) {
          board[i][j] = { color: 'black', isKing: false };
        }
      }
    }
    
    return board;
  }

  // Добавление игрока в очередь матчмейкинга
  addToMatchmaking(playerId) {
    this.waitingPlayers.add(playerId);
    return this.findMatch(playerId);
  }

  // Поиск матча для игрока
  findMatch(playerId) {
    for (const waitingPlayerId of this.waitingPlayers) {
      if (waitingPlayerId !== playerId) {
        this.waitingPlayers.delete(waitingPlayerId);
        this.waitingPlayers.delete(playerId);
        return this.createSession(playerId, waitingPlayerId);
      }
    }
    return null;
  }

  // Получение сессии по ID
  getSession(gameId) {
    return this.sessions.get(gameId);
  }

  // Проверка валидности хода
  isValidMove(session, playerId, from, to) {
    if (session.currentTurn !== playerId) return false;
    
    const piece = session.board[from.row][from.col];
    if (!piece || piece.color !== session.players[playerId].color) return false;
    
    // Здесь должна быть более сложная логика проверки хода
    // Это базовая проверка
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    
    return rowDiff === 1 && colDiff === 1;
  }

  // Выполнение хода
  makeMove(gameId, playerId, from, to) {
    const session = this.sessions.get(gameId);
    if (!session) return null;

    if (!this.isValidMove(session, playerId, from, to)) return null;

    // Копируем доску для обновления
    const newBoard = session.board.map(row => [...row]);
    
    // Перемещаем шашку
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = null;

    // Обновляем состояние сессии
    session.board = newBoard;
    session.currentTurn = Object.keys(session.players).find(id => id !== playerId);

    return session;
  }

  // Удаление игрока из сессии
  removePlayer(playerId) {
    this.waitingPlayers.delete(playerId);
    
    for (const [gameId, session] of this.sessions) {
      if (playerId in session.players) {
        session.status = 'finished';
        session.winner = Object.keys(session.players).find(id => id !== playerId);
        return gameId;
      }
    }
    return null;
  }
}

module.exports = new GameSessionManager(); 