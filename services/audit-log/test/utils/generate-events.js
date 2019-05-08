#!/usr/bin/env node
/* eslint new-cap: "off" */


/* ========================================================================================
This file can be used to test RabbitMQ functionality locally, via "node generate-events.js"
Due to a lack of amqp mocking capabilities, this currently cannot be tested automatically
 ========================================================================================== */

const amqp = require('amqplib/callback_api');

const config = require('../../app/config/index');
const log = require('../../app/config/logger'); // eslint-disable-line

amqp.connect(config.amqpUrl, (err, conn) => {
  if (err !== null) {
    console.log(err);
    console.log('Can\'t connect RabbitMQ. Server not running?');
    process.exit(1);
  }
  conn.createChannel((error, ch) => {
    ch.assertExchange(config.exchangeName, 'topic', { durable: false });

    const validObject = {
      service: 'SomeService',
      timeStamp: '1234',
      nameSpace: 'outerSpace',
      payload: {
        tenant: '1',
        source: '200',
        object: 'x',
        action: 'noaction',
        subject: 'Test subject',
        details: 'Here goes the description.',
      },
    };

    const validObject2 = {
      service: 'SomeOtherService',
      timeStamp: '1235',
      nameSpace: 'outerSpace',
      payload: {
        tenant: '2',
        source: '400',
        object: 'y',
        action: 'noaction',
        subject: 'Test subject',
        details: 'Here goes the description.',
      },
    };

    const msg = JSON.stringify(validObject);
    const msg2 = JSON.stringify(validObject2);

    ch.publish(config.exchangeName, config.exchangeTopic, new Buffer.from(msg));
    log.debug(" [x] Sent %s: '%s'", config.exchangeTopic, msg);
    ch.publish(config.exchangeName, config.exchangeTopic, new Buffer.from(msg2));
    log.debug(" [x] Sent %s: '%s'", config.exchangeTopic, msg2);
  });

  setTimeout(() => { conn.close(); }, 500);
});
