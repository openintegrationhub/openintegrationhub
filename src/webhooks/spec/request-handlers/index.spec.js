const index = require('../../src/request-handlers');
const { expect } = require('chai');
const Base = require('../../src/request-handlers/base');
const Head = require('../../src/request-handlers/head');
const Post = require('../../src/request-handlers/post');

describe('Request Handlers index', () => {
    it('should expose Base', () => {
        expect(index.Base).to.equal(Base);
    });

    it('should expose Head', () => {
        expect(index.Head).to.equal(Head);
    });

    it('should expose Post', () => {
        expect(index.Post).to.equal(Post);
    });
});
