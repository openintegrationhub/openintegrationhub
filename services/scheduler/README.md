# Scheduler
Schedules flows for execution.

## Default implementation is to be implemented yet
There are 3 objects that a `Scheduler` instance requires: `config`, `flowsDao` and `schedulePublisher`. These objects have to be provided to the constructor of `Scheduler`.
`flowsDao` is a service, where `Scheduler` finds flows for execution.
`schedulePublisher` is a service which is supposed to publish a command for scheduling a certain flow.

### Elastic.io implementation
As an example, `elastic.io` implementation of the mentioned dependencies:

```
const flowScheduler = new FlowScheduler({ amqpConnection: init.getAMQPConnection() });

const schedulePublisher = {
    async scheduleFlow(flow) {
        const flowLogger = rootLogger.taskLogger({ taskId: flow.id });
        try {
            await flowScheduler.scheduleTaskRun(flow);
        } catch (err) {
            flowLogger.error(err, 'Failed to schedule flow run');
        }
    }
};

const flowsDao = {
    findForScheduling({ limit }) {
        rootLogger.info('HEALTHCHECK.SCHEDULER_HEARTBEAT');
        return Flow.findForScheduling({ limit });
    },

    async planNextRun(flow) {
        const flowLogger = rootLogger.taskLogger({ taskId: flow.id });

        try {
            await flow.adjustSchedulingParams();
            await flow.store();
            flowLogger.info(`dueExecution is set to ${flow.dueExecution}`);
        } catch (err) {
            flowLogger.error(err, 'Failed to update dueExecution');
        }
    }
};
```
