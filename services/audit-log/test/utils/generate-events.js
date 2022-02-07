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
        ch.assertExchange('event-bus', 'topic', { durable: true });

        const validObject = {
            name: 'flowrepo.flow.deleted',
            payload: {
                details: 'A flow with the id abc was deleted',
            },
        };

        const msg = JSON.stringify(validObject);

        ch.publish('event-bus', 'flowrepo.flow.deleted', new Buffer.from(msg));
    });

    setTimeout(() => { conn.close(); }, 500);
});
