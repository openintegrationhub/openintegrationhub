# elasticio-sailor-nodejs [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]

> The official elastic.io library for bootstrapping and executing for Node.js connectors.

[![NPM](https://nodei.co/npm/elasticio-sailor-nodejs.png?downloads=true)](https://nodei.co/npm/elasticio-sailor-nodejs/)

`elasticio-sailor-nodejs` is a **required dependency for all components build for [elastic.io platform](http://www.elastic.io) in Node.js**. Add the dependency in the `package.json` file in the following way:

```json
    "dependencies": {
        "q": "^1.4.1",
        "elasticio-sailor-nodejs": "^2.2.1",
        "elasticio-node": "^0.0.8"
    }
```

## Building components in Node.js

If you plan to build a component for [elastic.io platform](http://www.elastic.io) in Node.js then you can visit our dedicated documentation page which describes [how to build a component in node.js](https://support.elastic.io/support/solutions/articles/14000027123-how-to-build-a-component-in-node-js).

### Before you start

Before you can deploy any code into our system **you must be a registered elastic.io platform user**. Please see our home page at [http://www.elastic.io](http://www.elastic.io) to learn how.

> Any attempt to deploy a code into our platform without a registration would fail.

After the registration and opening of the account you must **[upload your SSH Key](https://support.elastic.io/support/solutions/articles/14000038794-manage-your-ssh-keys)** into our platform.

> If you fail to upload you SSH Key you will get **permission denied** error during the deployment.

### Getting Started

After registration and uploading of your SSH Key you can proceed to deploy it into our system. At this stage we suggest you to:
*   [Create a team](https://docs.elastic.io/guides/teams-and-repos.html#creating-a-developer-team) to work on your new component. This is not required but will be automatically created using random naming by our system so we suggest you name your team accordingly.
*   [Create a repository](https://docs.elastic.io/guides/teams-and-repos.html#create-a-component-repository) inside the team to deploy your new component code.

### Examples of Node.js components

Here is a list of components build on Node.js:

*   [petstore-component-nodejs](https://github.com/elasticio/petstore-component-nodejs) to build your first component
*   [code-component](https://github.com/elasticio/code-component) to run pieces of synchronous JavaScript inside your integration flow,
*   [webhook-component](https://github.com/elasticio/webhook-component) to send and receive WebHooks on elastic.io platform,
*   [csv-component](https://github.com/elasticio/csv-component) to work with CSV files in your integration flow,
*   [sugarcrm-component](https://github.com/elasticio/sugarcrm-component) to use Sugar CRM in your integrations

[travis-image]: https://travis-ci.org/elasticio/sailor-nodejs.svg?branch=master
[travis-url]: https://travis-ci.org/elasticio/sailor-nodejs
[daviddm-image]: https://david-dm.org/elasticio/sailor-nodejs.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/elasticio/sailor-nodejs

## Sailor logging

Sailor uses [bunyan](https://github.com/trentm/node-bunyan) logging framework. 
 
Supported log levels are:

- `FATAL`
- `ERROR`
- `WARN`
- `INFO`
- `DEBUG`
- `TRACE`

Default log level is `INFO`. You can change default log level with environment variable `LOG_LEVEL`.

Sailor logger adds the following extra context to log messages:

- `ELASTICIO_API_USERNAME`
- `ELASTICIO_COMP_ID`
- `ELASTICIO_COMP_NAME`
- `ELASTICIO_CONTAINER_ID`
- `ELASTICIO_CONTRACT_ID`
- `ELASTICIO_EXEC_ID`
- `ELASTICIO_EXEC_TYPE`
- `ELASTICIO_EXECUTION_RESULT_ID`
- `ELASTICIO_FLOW_ID`
- `ELASTICIO_FLOW_VERSION`
- `ELASTICIO_FUNCTION`
- `ELASTICIO_STEP_ID`
- `ELASTICIO_TASK_USER_EMAIL`
- `ELASTICIO_TENANT_ID`
- `ELASTICIO_USER_ID`
- `ELASTICIO_WORKSPACE_ID`

## Component logging

Sailor exposes logger object for use in a component. Component logger inherits log level from sailor's logger
and adds the following extra context to log messages:

- `messageId` (unique ID of the next RabbitMQ message)
- `parentMessageId` (unique ID of previous RabbitMQ message)
- `threadId` (unique ID of execution thread)

Component logger usage example:

```JavaScript
this.logger.fatal('message');
this.logger.error('message');
this.logger.warn('message');
this.logger.info('message');
this.logger.debug('message');
this.logger.trace('message');
```

## Flow control

When working in the multi-tenant integration environment it's important to obey the API and
consumption limits imposed by the platform. This is not only a condition for you integrations to
run on the platform (and not begin suspended), but also a good integration practice to sustainably
and efficiently use resources.

Imagine a system where one party (published) publishes to the queue and one or more consumers
consume from the queue. If publishers are writing to the queue faster than consumers read data
from the queue, queue will earlier or later be overfilled. Once one queue of your integration flow
will grow to a particular limit, the complete integration flow will be suspended and author will be
informed about it. Flow control is a build-in mechanism in the SDK that will help you to prevent
the overflow to happen.

There are two types of flow control:
 * Static flow control - the hard limit of the events (e.g. messages published to the queue) that can
 be generated by component. This limit is dictated by your pricing plan and will limit protect the
 platform from extensive load.
 * Dynamic flow control - the limit that is imposed based on the state of individual queue, more
 messages are in the queue, slower publisher could write to it.

Let's take a look at the simple example:

```JavaScript
'use strict';

exports.process = process;

async function process(msg, cfg, snapshot) {
    for (let i = 0; i < 100000; i++) {
        this.logger.info('Sending message %s', i);
        await this.emit('data', {
            body: {
                counter: i,
                hi: 'there'
            }
        });
        this.logger.info('Message %s was sent', i);
    }
}
```

This simple component, once started on the platform will generate 100k messages. Without flow control this
example will quickly bring the integration queue to the limits and integration flow will be suspended.
With flow control the publishing rate of the messages will be slowed down so both publisher and consumers
will operate in balance.

### How to configure it

There is a set of environment variables that are responsible for the configuration of the static flow control
(dynamic flow control is implemented in the message-oriented middleware of the platform hence can't be configured
on the component level)

 * ELASTICIO_DATA_RATE_LIMIT - a number of maximum `data` messages per second that could be emitted
 by the component
 
 * ELASTICIO_SNAPSHOT_RATE_LIMIT - a number of maximum `snapshot` messages per second that could be emitted
 by the component
 
 * ELASTICIO_PROCESS_AMQP_DRAIN, (boolean) - true value means that 'emit' method in component would return
 promise which will resolve to true value when amqplib inner buffer would be empty. Preventing OutOfMemoryError
 on buffer overflow.

## Sailor hooks

### Init hook

```javascript
/**
* cfg - This is the same config as the one passed to "processMessage" method of the trigger or action
*/
exports.init = function(cfg) {
    //do stuff
    return Promise.resolve();
}
```

### Startup hook

```javascript
/**
* cfg - This is the same config as the one passed to "processMessage" method of the trigger or action
*/
exports.startup = function(cfg) {
    //do stuff
    const data = {
        message: 'Hello from STARTUP_HOOK'
    };
    return Promise.resolve(data);
}
```

- Only on the first trigger
- Called without ``this``
- May return promise
- May return value
- May throw - not recommended
- May return a promise that will fail

- Startup logs can be found in the tab of the component on execution page
- TBD - Separate them under different tab in UI
- TBD - Where to see restart errors?overwritten

Startup state data - either return value or the result of the promise

- OK
  - Results will be stored as the startup state, previous will be overwritten with warning
  - After that init hook will be run, etc
- NOK
  - Sailor will exit the process
  - Platform will restart the component immediately
  - If init wont' happen it will be removed after 5 minutes (see restart policy)
  - In the next scheduling interval initialisation will repeat

### Shutdown hook

```javascript
/**
* cfg - This is the same config as the one passed to "processMessage" method of the trigger or action
* startData - result from the startup
*/
exports.shutdown = function(cfg, startData) {
    //corresponding to the startup example above, startData is { message: 'Hello from STARTUP_HOOK' }
    //do stuff
    return Promise.resolve();
}
```

 - Only on the first trigger
 - One stop is pressed
    - If task is running then containers are shutdown
    - If task is sleeping then do nothing
 - Start new trigger container
 - Trigger starts without ``this`` context - it's not possible to log errors or send new data
 - Should either return value (ignored) or promise (resolved).
 - Startup data is removed after shutdown hook
 - Call the shutdown hook, parameters that are passed is from the startup results or ``{}`` if nothing was returned
 - Errors are ignored
 - If shutdown hook won't complete within 60 seconds then container will be killed
 - As soon as user pressed stop, task is marked as inactive and 'webhooks gateway' will start responding with the error (Task either does not exist or is inactive) to possible data

TBD - log for shutdown hooks?
