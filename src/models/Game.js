const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  players: [{
    type: String,  // Socket ID
    required: true
  }],
  board: {
    type: [[Number]],  // 2D array representing the game board
    required: true
  },
  currentTurn: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'finished'],
    default: 'waiting'
  },
  winner: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Game', gameSchema); 