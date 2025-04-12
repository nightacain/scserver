const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  winnerColor: {
    type: String,
    enum: ['white', 'black'],
    required: true
  },
  endReason: {
    type: String,
    enum: ['victory', 'surrender', 'disconnect'],
    required: true
  },
  duration: {
    type: Number, // длительность в секундах
    required: true
  }
}, { 
  timestamps: true 
});

// Виртуальное поле для получения даты в нужном формате
matchSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString('ru-RU');
});

module.exports = mongoose.model('Match', matchSchema); 