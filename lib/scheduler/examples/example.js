const { Scheduler, SchedulePublisher, FlowsDao } = require('..');

class MyFlowsDao extends FlowsDao {
    //this method should return flows ready to be scheduled
    //they could be fetched e.g. from a DB or an API call
    async findForScheduling() { //eslint-disable-line no-unused-vars
        return Flows.findByScheduleDate();
    }

    //this method should determine when a flow should be scheduled next time
    async planNextRun(flow) { //eslint-disable-line no-unused-vars
        flow.nextRun = Date.now() + 3 * 60 * 1000;
        await flow.save();
    }
}

class MySchedulePublisher extends SchedulePublisher {
    // this method should send a message to an "executor" in order to run a flow
    // e.g. to some message queue or to post it by API call
    async scheduleFlow(flow) { //eslint-disable-line no-unused-vars
        const qName = '';
        const msg = {};
        const msgOpts = {};
        return amqpChannel.sendToQueue(qName, msg, msgOpts);
    }
}

(async () => {
    const config = nconf; //object with nconf-like API
    const flowsDao = new MyFlowsDao();
    const schedulePublisher = new MySchedulePublisher();
    const scheduler = new Scheduler(config, flowsDao, schedulePublisher);
    await scheduler.run();
})().catch(err => {
    console.error(err);
    process.exit(1);
});
