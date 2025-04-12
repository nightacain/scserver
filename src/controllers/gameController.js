const Game = require('../models/Game');

const gameController = {
  // Создать новую игру
  createGame: async (req, res) => {
    try {
      const newGame = new Game({
        players: [req.body.playerId],
        board: Array(8).fill().map(() => Array(8).fill(0)),
        currentTurn: req.body.playerId,
        status: 'waiting'
      });
      
      const savedGame = await newGame.save();
      res.status(201).json(savedGame);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Присоединиться к игре
  joinGame: async (req, res) => {
    try {
      const game = await Game.findById(req.params.gameId);
      
      if (!game) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      if (game.players.length >= 2) {
        return res.status(400).json({ message: 'Game is full' });
      }
      
      game.players.push(req.body.playerId);
      game.status = 'in_progress';
      
      const updatedGame = await game.save();
      res.json(updatedGame);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Получить состояние игры
  getGame: async (req, res) => {
    try {
      const game = await Game.findById(req.params.gameId);
      
      if (!game) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Обновить состояние игры
  updateGame: async (req, res) => {
    try {
      const game = await Game.findById(req.params.gameId);
      
      if (!game) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      Object.assign(game, req.body);
      const updatedGame = await game.save();
      
      res.json(updatedGame);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = gameController; 