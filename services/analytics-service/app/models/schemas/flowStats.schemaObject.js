// Statistics of overall global flow usage

const flowStats = {
  active: { type: 'Number', default: 0 },
  inactive: { type: 'Number', default: 0 },
  bucketStartAt: { type: 'Date', default: 0 },
};

module.exports.flowStats = flowStats;
