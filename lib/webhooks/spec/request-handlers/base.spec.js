const Base = require('../../src/request-handlers/base');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Base request handler', () => {
    let base;
    let req;
    let res;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        req = {
            id: 'req-id',
            flow: {
                id: 'test-id'
            },
            on() {}
        };
        res = {
            on() {}
        };

        sandbox.spy(res, 'on');
        sandbox.spy(req, 'on');

        base = new Base(req, res);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('constructor', () => {
        it('should set _req', () => {
            expect(base._req).to.equal(req);
        });

        it('should set _res', () => {
            expect(base._res).to.equal(res);
        });

        it('should set _isStopped', () => {
            expect(base._isStopped).to.be.false;
        });

        it('should set _dateStarted', () => {
            expect(base._dateStarted).not.to.be.undefined;
        });

        it('should set _logger', () => {
            expect(base._logger).not.to.be.undefined;
            ['child', 'info', 'warn', 'debug', 'error', 'trace'].forEach(key => {
                expect(base._logger[key]).to.be.a('function');
            });
        });

        it('should listen to close event of req', () => {
            expect(req.on.calledOnce).to.be.true;
            expect(req.on.calledWith('close')).to.be.true;
        });

        it('should listen to close event of req', () => {
            expect(res.on.calledOnce).to.be.true;
            expect(res.on.calledWith('end')).to.be.true;
        });
    });

    it('#handle', () => {
        expect(base.handle).to.throw('This method has to be implemented');
    });

    it('#getRequestId', () => {
        expect(base.getRequestId()).to.equal('req-id');
    });

    it('#getRequestId', () => {
        expect(base.getRequestId()).to.equal('req-id');
    });

    it('#getFlow', () => {
        expect(base.getFlow()).to.equal(req.flow);
    });

    describe('#isStopped', () => {
        it('initial state should be false', () => {
            expect(base.isStopped()).to.be.false;
        });
    });
});
