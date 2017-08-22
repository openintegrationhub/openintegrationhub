# sailor-nodejs [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]

> The official elastic.io library for bootstrapping and executing for Node.js connectors.

[![NPM](https://nodei.co/npm/elasticio-sailor-nodejs.png?downloads=true)](https://nodei.co/npm/elasticio-sailor-nodejs/)

This is a required dependency for all components build for [elastic.io platform](http://www.elastic.io) in Node.js . This dependency is described usually in `package.json` file in the following way:

```json
    "dependencies": {
        "q": "^1.4.1",
        "elasticio-sailor-nodejs": "^1.1.0",
        "elasticio-node": "^0.0.5"
    }
```

## Building components in Node.js

If you plan to build a component for [elastic.io platform](http://www.elastic.io) in Node.js then you can visit our dedicated documentation page which describes [how to build a component in node.js](http://docs.elastic.io/docs/building-a-component-in-nodejs).

## Before you start

Before you can deploy any code into our system **you must be a registered elastic.io platform user**. Please see our home page at [http://www.elastic.io](http://www.elastic.io) to learn how.

> Any attempt to deploy a code into our platform without a registration would fail.

After the registration and opening of the account you must **[upload your SSH Key](http://docs.elastic.io/docs/ssh-key)** into our platform.

> If you fail to upload you SSH Key you will get **permission denied** error during the deployment.

## Getting Started

After registration and uploading of your SSH Key you can proceed to deploy it into our system. At this stage we suggest you to:
* [Create a team](http://docs.elastic.io/page/team-management) to work on your new component. This is not required but will be automatically created using random naming by our system so we suggest you name your team accordingly.
* [Create a repository](http://docs.elastic.io/page/repository-management) where your new component is going to *reside* inside the team that you have just created.

## Examples of Node.js components

We have numerous components build on Node.js apart from above mentioned [hello-world-nodejs](https://github.com/elasticio/hello-world-nodejs). Here are some  other community component examples:

* [code-component](https://github.com/elasticio/code-component) to run pieces of synchronous JavaScript inside your integration flow,
* [webhook-component](https://github.com/elasticio/webhook-component) to send and receive WebHooks on elastic.io platform,
* [csv-component](https://github.com/elasticio/csv-component) to work with CSV files in your integration flow,
* [sugarcrm-component](https://github.com/elasticio/sugarcrm-component) to use Sugar CRM in your integrations
* and many more ...

[travis-image]: https://travis-ci.org/elasticio/sailor-nodejs.svg?branch=master
[travis-url]: https://travis-ci.org/elasticio/sailor-nodejs
[daviddm-image]: https://david-dm.org/elasticio/sailor-nodejs.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/elasticio/sailor-nodejs

## Sailor hooks

### Startup hook
 - Only on the first trigger
 - Called without ``this``
 - May return promise
 - May return value
 - May throw - not recommended
 - May return a promise that will fail

 - TBD - Startup logs, where to find it?
 - TBD - Separate them under different tab in UI
 - TBD - Where to see restart errors?

Startup state data - either return value or the result of the promise
 - OK 
    - Results will be stored as the startup state, previous will be overwriten with warning
    - After that init hook will be run, etc
 - NOK 
   - Sailor will exit the process
   - Platform will restar the component immediately
   - If init wont' happen it will be removed after 5 minutes (see restart policy)
   - In the next scheduling interval initialiation will repeat

### Shutdown hook
 - Only on the first trigger
 - One stop is pressed
    - If task is running then containers are shutdown
    - If taks is sleeping then do nothing
 - Start new trigger container
 - Trigger starts without ``this`` context - it's not possible to log errors or send new data
 - Should either return value (ignored) or promise (resolved).
 - Startup data is removed after shutdown hook
 - Call the shutdown hook, parameters that are passed is from the startup results or ``{}`` if nothing was returned
 - Errors are ignored
 - If shutdown hook won't complete within 60 seconds then container will be killed
 - As soon as user pressed stop, task is marked as inactive and hooks will start responding with the error to possible data

TBD - log for shutdown hooks?
