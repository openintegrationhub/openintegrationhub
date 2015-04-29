describe('Settings', function () {

    var settings = require('../lib/settings.js');

    it('should throw error if no important settings provided', function () {
        expect(function(){
            settings.readFrom({});
        }).toThrow('MONGO_URI is missing');
    });

    it('should not throw error if all important settings provided', function () {

        var envVars = {};
        envVars.MONGO_URI = 'mongodb://test/test';
        envVars.AMQP_URI = 'amqp://test2/test2';
        envVars.TASK_ID = '1234567890';
        envVars.STEP_ID = 'step_1';

        var result = settings.readFrom(envVars);
        expect(result.INCOMING_MESSAGES_QUEUE.name).toEqual('1234567890:step_1:incoming');
    });

    it('should use INCOMING_MESSAGES_QUEUE from .env', function () {

        var envVars = {};
        envVars.MONGO_URI = 'mongodb://test/test';
        envVars.AMQP_URI = 'amqp://test2/test2';
        envVars.TASK_ID = '1234567890';
        envVars.STEP_ID = 'step_1';
        envVars.INCOMING_MESSAGES_QUEUE = 'incoming-messages-queue-name';
        var result = settings.readFrom(envVars);

        expect(result.INCOMING_MESSAGES_QUEUE.name).toEqual('incoming-messages-queue-name');
    });

});
