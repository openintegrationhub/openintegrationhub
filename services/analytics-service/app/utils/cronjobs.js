const schedule = require('node-schedule');
const log = require('../config/logger');

let jobTest; // eslint-disable-line no-unused-vars

function createCronJobs() {
  log.info('Setting up cronjobs');

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
