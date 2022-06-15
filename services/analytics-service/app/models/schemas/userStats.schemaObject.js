// Statistics of overall global flow usage

const userStats = {
  total: { type: 'Number', default: 0 },
  recentlyActive: { type: 'Number', default: 0 },
  inactive: { type: 'Number', default: 0 },
};

module.exports.userStats = userStats;
