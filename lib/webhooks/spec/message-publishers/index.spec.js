const MessagePublishers = require('../../src/message-publishers');
const BasePublisher = require('../../src/message-publishers/base');
const { expect } = require('chai');

describe('MessagePublishers index', () => {
    it('should expose Base publisher', () => {
        expect(MessagePublishers.Base).to.equal(BasePublisher);
    });
});
