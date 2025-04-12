class GameSocket {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.color = null;
    this.callbacks = {
      onGameFound: null,
      onGameState: null,
      onGameEnded: null,
      onError: null,
      onWaiting: null
    };
  }

  connect() {
    if (!authService.isAuthenticated()) {
      throw new Error('Требуется авторизация');
    }

    this.socket = io('http://localhost:5000', {
      auth: {
        token: authService.getToken()
      }
    });

    this.setupListeners();
  }

  setupListeners() {
    // Обработка ошибок подключения
    this.socket.on('connect_error', (error) => {
      console.error('Ошибка подключения:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Ошибка подключения к серверу');
      }
    });

    // Ожидание противника
    this.socket.on('waiting_for_opponent', () => {
      console.log('Ожидание противника...');
      if (this.callbacks.onWaiting) {
        this.callbacks.onWaiting();
      }
    });

    // Игра найдена
    this.socket.on('game_found', (gameData) => {
      console.log('Игра найдена:', gameData);
      this.gameId = gameData.gameId;
      this.color = gameData.yourColor;
      
      if (this.callbacks.onGameFound) {
        this.callbacks.onGameFound(gameData);
      }

      // Автоматически присоединяемся к игре
      this.joinGame(this.gameId);
    });

    // Обновление состояния игры
    this.socket.on('game_state', (gameState) => {
      console.log('Обновление состояния игры:', gameState);
      if (this.callbacks.onGameState) {
        this.callbacks.onGameState(gameState);
      }
    });

    // Игра завершена
    this.socket.on('game_ended', (data) => {
      console.log('Игра завершена:', data);
      if (this.callbacks.onGameEnded) {
        this.callbacks.onGameEnded(data);
      }
    });

    // Недопустимый ход
    this.socket.on('invalid_move', () => {
      if (this.callbacks.onError) {
        this.callbacks.onError('Недопустимый ход');
      }
    });
  }

  // Поиск игры
  findGame() {
    if (!this.socket) {
      throw new Error('Нет подключения к серверу');
    }
    this.socket.emit('find_game');
  }

  // Присоединение к игре
  joinGame(gameId) {
    if (!this.socket) {
      throw new Error('Нет подключения к серверу');
    }
    this.socket.emit('join_game', gameId);
  }

  // Выполнение хода
  makeMove(from, to) {
    if (!this.socket || !this.gameId) {
      throw new Error('Нет активной игры');
    }
    this.socket.emit('make_move', {
      gameId: this.gameId,
      from,
      to
    });
  }

  // Сдаться
  surrender() {
    if (!this.socket || !this.gameId) {
      throw new Error('Нет активной игры');
    }
    this.socket.emit('surrender', this.gameId);
  }

  // Отключение
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.gameId = null;
      this.color = null;
    }
  }

  // Установка callback-функций
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

const gameSocket = new GameSocket(); 