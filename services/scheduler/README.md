# Scheduler
Schedules flows for execution.

## Default implementation is to be implemented yet
There are 2 object that `Scheduler` instance requires: `flowsDao` and `schedulePublisher`. These object have to be provided to the constructor of `Scheduler`.
`flowsDao` is a service, where `Scheduler` finds flows for execution.
`schedulePublisher` is a service which is supposed to publish a command for scheduling a certain flow.

### Elastic.io implementation
As an example, `elastic.io` implementation of the mentioned dependencies:

```
const flowScheduler = new FlowScheduler({ amqpConnection: init.getAMQPConnection() });

const schedulePublisher = {
    async scheduleFlow(flow) {
        const taskLogger = rootLogger.taskLogger({ taskId: flow.id });
        try {
            await flowScheduler.scheduleTaskRun(flow);
        } catch (err) {
            taskLogger.error(err, 'Failed to schedule flow run');
        }
    }
};

const flowsDao = {
    findForScheduling({ limit }) {
        rootLogger.info('HEALTHCHECK.SCHEDULER_HEARTBEAT');
        return Flow.findForScheduling({ limit });
    },

    async planNextRun(flow) {
        const taskLogger = rootLogger.taskLogger({ taskId: flow.id });

        try {
            await flow.adjustSchedulingParams();
            await flow.store();
            taskLogger.info(`dueExecution is set to ${flow.dueExecution}`);
        } catch (err) {
            taskLogger.error(err, 'Failed to update dueExecution');
        }
    }
};

const scheduler = new Scheduler({ config, flowsDao, schedulePublisher });
await scheduler.run();
```
