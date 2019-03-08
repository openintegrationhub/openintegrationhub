const { EventBus, RabbitMqTransport } = require('..');
const { Event } = require('..'); // only required for creating a new event

const bunyan = require('bunyan'); // import your logger (needs to support an: .trace(), debug() and .error() method at the moment)

let c = 1;
(async () => {
    // passing the logger
    const logger = bunyan.createLogger({name: 'test'});

    // configuring the transport method
    const transport = new RabbitMqTransport({rabbitmqUri: 'amqp://localhost/', logger});

    // configuring the EventBus
    const eventBus = new EventBus({transport, logger, serviceName: 'my-service'});

    await eventBus.connect();


    // send messages later for testing
    setInterval(async function(){
      logger.error('setInterval call!!');

      // creating a new event
      const event = new Event({
          headers: {
              name: 'flow.started'
          },
          payload: {test: c}
      });

      c++;

      // publish the created event
      const result = await eventBus.publish(event);
      logger.error(result);
      if(result === false) {
        logger.error('Publishing failed you need to implement your own logic to retry if it fails on publishing');
      }
    }, 3000);
})().catch(console.error);
