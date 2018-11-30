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
        try {
            await flowScheduler.scheduleFlowRun(flow);
        } catch (err) {
            logger.error(err, 'Failed to schedule flow run');
        }
    }
};

const flowsDao = {
    findForScheduling() {
        return Flow.findForScheduling({ limit: config.get('POLLING_FLOW_COUNT') });
    },

    async planNextRun(flow) {
        try {
            await flow.adjustSchedulingParams();
            await flow.store();
            logger.info(`dueExecution is set to ${flow.dueExecution}`);
        } catch (err) {
            logger.error(err, 'Failed to update dueExecution');
        }
    }
};
```
