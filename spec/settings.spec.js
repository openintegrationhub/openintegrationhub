describe('Settings', function () {

    it('should exit if no important settings provided', function () {
        spyOn(process, 'exit').andReturn(true);

        delete require.cache[require.resolve('../lib/settings.js')];
        var settings = require('../lib/settings.js');

        expect(process.exit).toHaveBeenCalled();
        expect(process.exit).toHaveBeenCalledWith(1)
    });

    it('should not exit if all important settings provided', function () {

        process.env.MONGO_URI = 'mongodb://test/test';
        process.env.AMQP_URI = 'amqp://test2/test2';
        process.env.TASK_ID = '1234567890';
        process.env.STEP_ID = 'step_1';

        spyOn(process, 'exit').andReturn(true);

        delete require.cache[require.resolve('../lib/settings.js')];
        var settings = require('../lib/settings.js');

        expect(process.exit).not.toHaveBeenCalled();
        expect(settings.INCOMING_MESSAGES_QUEUE.name).toEqual('1234567890:step_1:incoming')
    });

    it('should use INCOMING_MESSAGES_QUEUE from .env', function () {

        process.env.MONGO_URI = 'mongodb://test/test';
        process.env.AMQP_URI = 'amqp://test2/test2';
        process.env.INCOMING_MESSAGES_QUEUE = 'incoming-messages-queue-name';

        spyOn(process, 'exit').andReturn(true);

        delete require.cache[require.resolve('../lib/settings.js')];
        var settings = require('../lib/settings.js');

        expect(process.exit).not.toHaveBeenCalled();
        expect(settings.INCOMING_MESSAGES_QUEUE.name).toEqual('incoming-messages-queue-name')
    });

});
