const logger = require('./src/logger');
const Scheduler = require('.');
const config = require('./config');

(async () => {
    const schedulePublisher = {
        async scheduleFlow(flow) { //eslint-disable-line no-unused-vars
            //@todo: implement
            //This method should e.g. make an RPC call to flows-operator in order to start a flow execution
        }
    };

    const flowsDao = {
        async findForScheduling({ limit }) { //eslint-disable-line no-unused-vars
            //@todo: implement
            //This method should return flows ready for a next execution cycle
            return [];
        },

        async planNextRun(flow) { //eslint-disable-line no-unused-vars
            //@todo: implement
            //This method should implement a logic of next execution planning
        }
    };

    const scheduler = new Scheduler({ config, flowsDao, schedulePublisher });
    await scheduler.run();
})().catch(err => {
    logger.error(err);
    process.exit(1);
});
