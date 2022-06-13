const schedule = require('node-schedule');

const log = require('../config/logger');
const config = require('../config/index');

const { getAndUpdateFlowStats } = require('./gatherStats');

let jobTest; // eslint-disable-line no-unused-vars
let jobAggregateData; // eslint-disable-line no-unused-vars

// Sort time frames smallest first
const timeFrames = Object.entries(config.timeWindows).sort((a, b) => a[1] - b[1]);

function createCronJobs() {
  log.info('Setting up cronjobs');

  const max = timeFrames.length - 1;
  for (let i = 0; i < max; i += 1) {
    console.log('TimeFrame', i, timeFrames[i]);
    console.log('We need to copy this data to a higher time frame');
  }

  const smallestTimeFrame = Object.entries(config.timeWindows).sort((a, b) => b[1] - a[1])[0][0];
  const ruleAggregateData = new schedule.RecurrenceRule();
  ruleAggregateData.minute = smallestTimeFrame;

  jobAggregateData = schedule.scheduleJob(ruleAggregateData, async () => {
    log.info('Getting flow stats via cron', Date.now());
    await getAndUpdateFlowStats();
  });

  const ruleTest = new schedule.RecurrenceRule();
  ruleTest.minute = 30;

  jobTest = schedule.scheduleJob(ruleTest, () => {
    log.info('Running test cronjob');
    log.info(Date.now());
  });
}

module.exports = {
  createCronJobs,
};
