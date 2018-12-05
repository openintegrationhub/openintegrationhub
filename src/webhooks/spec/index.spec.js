const index = require('..');
const HttpApi = require('../src/http-api');
const FlowsDao = require('../src/flows-dao');
const MessagePublishers = require('../src/message-publishers');
const RequestHandlers = require('../src/request-handlers');
const { expect } = require('chai');


describe('Index file', () => {
    it('should expose HttpApi', () => {
        expect(index.HttpApi).to.equal(HttpApi);
    });

    it('should expose MessagePublishers', () => {
        expect(index.MessagePublishers).to.equal(MessagePublishers);
    });

    it('should expose RequestHandlers', () => {
        expect(index.RequestHandlers).to.equal(RequestHandlers);
    });

    it('should expose FlowsDao', () => {
        expect(index.FlowsDao).to.equal(FlowsDao);
    });
});
