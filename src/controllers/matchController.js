const Match = require('../models/Match');
const User = require('../models/User');

const matchController = {
  // Создание записи о матче
  createMatch: async (matchData) => {
    try {
      const match = new Match(matchData);
      await match.save();

      // Обновляем статистику игроков
      await User.findByIdAndUpdate(matchData.winner, { $inc: { gamesPlayed: 1, gamesWon: 1 } });
      await User.findByIdAndUpdate(matchData.loser, { $inc: { gamesPlayed: 1 } });

      return match;
    } catch (error) {
      console.error('Ошибка при сохранении матча:', error);
      throw error;
    }
  },

  // Получение истории матчей пользователя
  getUserMatches: async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const matches = await Match.find({
        $or: [{ winner: userId }, { loser: userId }]
      })
        .populate('winner', 'username')
        .populate('loser', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Match.countDocuments({
        $or: [{ winner: userId }, { loser: userId }]
      });

      res.json({
        matches: matches.map(match => ({
          id: match._id,
          winner: match.winner.username,
          loser: match.loser.username,
          winnerColor: match.winnerColor,
          endReason: match.endReason,
          duration: match.duration,
          date: match.formattedDate,
          isWinner: match.winner._id.toString() === userId
        })),
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          limit
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Получение статистики пользователя
  getUserStats: async (req, res) => {
    try {
      const userId = req.user.id;

      const stats = await Match.aggregate([
        {
          $match: {
            $or: [{ winner: userId }, { loser: userId }]
          }
        },
        {
          $group: {
            _id: null,
            totalGames: { $sum: 1 },
            wins: {
              $sum: {
                $cond: [{ $eq: ['$winner', userId] }, 1, 0]
              }
            },
            totalDuration: { $sum: '$duration' },
            surrenders: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$endReason', 'surrender'] },
                    { $eq: ['$loser', userId] }
                  ]},
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalGames: 1,
            wins: 1,
            losses: { $subtract: ['$totalGames', '$wins'] },
            winRate: {
              $multiply: [
                { $divide: ['$wins', '$totalGames'] },
                100
              ]
            },
            averageDuration: { $divide: ['$totalDuration', '$totalGames'] },
            surrenders: 1
          }
        }
      ]);

      res.json(stats[0] || {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        averageDuration: 0,
        surrenders: 0
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = matchController; 