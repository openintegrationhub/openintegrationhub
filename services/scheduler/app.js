const logger = require('./src/logger');
const { Scheduler, FlowsDao, SchedulePublisher } = require('@openintegrationhub/scheduler');
const config = require('./config');

class OIH_FlowsDao extends FlowsDao {
    async findForScheduling() { //eslint-disable-line no-unused-vars
        //@todo: implement
        //This method should return flows ready for a next execution cycle
        return [];
    }

    async planNextRun(flow) { //eslint-disable-line no-unused-vars
        //@todo: implement
        //This method should implement a logic of next execution planning
    }
}

class OIH_SchedulePublisher extends SchedulePublisher {
    async scheduleFlow(flow) { //eslint-disable-line no-unused-vars
        //@todo: implement
        //This method should e.g. make an RPC call to flows-operator in order to start a flow execution
    }
}

(async () => {
    const flowsDao = new OIH_FlowsDao();
    const schedulePublisher = new OIH_SchedulePublisher();
    const scheduler = new Scheduler(config, flowsDao, schedulePublisher);
    await scheduler.run();
})().catch(err => {
    logger.error(err);
    process.exit(1);
});
