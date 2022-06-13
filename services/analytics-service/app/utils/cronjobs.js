const schedule = require('node-schedule');

const log = require('../config/logger');
const config = require('../config/index');

const { getAndUpdateFlowStats } = require('./gatherStats');

let jobTest; // eslint-disable-line no-unused-vars
let jobAggregateData; // eslint-disable-line no-unused-vars

function createCronJobs() {
  log.info('Setting up cronjobs');

  const smallestTimeFrame = Object.entries(config.timeWindows).sort((a, b) => a[1] - b[1])[0][0];
  log.debug('smallestTimeFrame', smallestTimeFrame);
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
