const schedule = require('node-schedule');
const dayjs = require('dayjs');

const log = require('../config/logger');
const config = require('../config/index');

const {
  getAndUpdateFlowStats,
  getAndUpdateComponents,
  getAndUpdateFlowTemplates,
  getAndUpdateUserStats,
} = require('./gatherStats');

let jobTest; // eslint-disable-line no-unused-vars
let jobAggregateData; // eslint-disable-line no-unused-vars

function createCronJobs() {
  log.info('Setting up cronjobs');

  jobAggregateData = schedule.scheduleJob(config.pollingCron, async () => {
    log.info('Executing cronjob at: ', dayjs().format());

    const auth = `Bearer ${config.iamToken}`;

    await getAndUpdateFlowStats(auth);
    await getAndUpdateUserStats(auth);
    await getAndUpdateComponents(auth);
    await getAndUpdateFlowTemplates(auth);
  });

  const ruleTest = new schedule.RecurrenceRule();
  ruleTest.minute = 30;

  jobTest = schedule.scheduleJob(ruleTest, () => {
    log.info('Running test cronjob');
    log.info(dayjs().format());
  });
}

module.exports = {
  createCronJobs,
};
