
/* eslint no-unused-expressions: 0 */ // --> OFF
/* eslint no-underscore-dangle: 0 */ // --> OFF
/* eslint max-len: 0 */ // --> OFF

const chai = require('chai');

const { expect } = chai;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { TaskExec } = require('../../lib/executor.js');

describe('Executor', () => {
    const apiClientStub = {};
    const amqpConnStub = {};
    const configStub = {};
    const loggerOptions = {};
    const taskVars = {};
    const defaultTaskExecArgs = {
        loggerOptions,
        variables: taskVars,
        services: {
            apiClient: apiClientStub,
            config: configStub,
            amqp: amqpConnStub
        }
    };

    describe('#constructor', () => {
        it('should be constructable without arguments', () => {
            const taskexec = new TaskExec(defaultTaskExecArgs);
            expect(taskexec).to.be.instanceof(TaskExec);
        });
        it('should properly store variables', () => {
            const vars = {
                var1: 'val1',
                var2: 'val2'
            };
            const taskexec = new TaskExec(Object.assign({}, defaultTaskExecArgs, { variables: vars }));
            expect(taskexec._variables).to.deep.equal(vars);
        });
    });
    describe('getVariables', () => {
        it('should return flow variables', () => {
            const vars = {
                var1: 'val1',
                var2: 'val2'
            };
            const taskexec = new TaskExec(Object.assign({}, defaultTaskExecArgs, { variables: vars }));
            expect(taskexec.getFlowVariables()).to.deep.equal(vars);
        });
    });
    // describe('getApiClient', () => {
    //     it('should return api client', () => {
    //         const taskExec = new TaskExec(defaultTaskExecArgs);
    //         expect(taskExec.getApiClient()).to.equal(defaultTaskExecArgs.services.apiClient);
    //     });
    // });
    describe('getConfig', () => {
        it('should return config', () => {
            const taskExec = new TaskExec(defaultTaskExecArgs);
            expect(taskExec.getConfig()).to.equal(defaultTaskExecArgs.services.config);
        });
    });
    describe('__getAmqp', () => {
        it('should return config', () => {
            const taskExec = new TaskExec(defaultTaskExecArgs);
            expect(taskExec.__getAmqp()).to.equal(defaultTaskExecArgs.services.amqp);
        });
    });
    describe('Return Promise interface', () => {
        describe('error is thrown', () => {
            it('should emit error and end with await\'s', (done) => {
                const taskExec = new TaskExec(defaultTaskExecArgs);
                const onDataStub = sinon.stub();
                const error = new Error();
                const emitErrorDoneStub = sinon.stub();
                const onErrorStub = sinon.stub().callsFake(async () => new Promise(resolve => process.nextTick(() => {
                    // move emitErrorDoneStub to next tick
                    // to make possible to test that emit('end') really wait's for job
                    emitErrorDoneStub();
                    resolve();
                })));
                const onEndStub = sinon.stub().callsFake(async () => {
                    try {
                        expect(onErrorStub).to.have.been.calledOnce.and.calledWith(error);
                        expect(onEndStub).to.have.been
                            .calledAfter(onErrorStub)
                            .and.calledAfter(emitErrorDoneStub)
                            .and.calledOnce;
                        expect(onDataStub).not.to.have.been.called;
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                const triggerOrActionStub = sinon.stub().rejects(error);
                const payload = {};
                const cfg = {};
                const snapshot = {};
                taskExec
                    .on('error', onErrorStub)
                    .on('end', onEndStub)
                    .on('data', onDataStub);

                taskExec.process(
                    { process: triggerOrActionStub },
                    payload,
                    cfg,
                    snapshot
                );
            });
        });
        describe('promise is returned', () => {
            it('should emit error and end with await\'s', (done) => {
                const taskExec = new TaskExec(defaultTaskExecArgs);
                const onErrorStub = sinon.stub();
                const emitDataDoneStub = sinon.stub();
                const data = {};
                const onDataStub = sinon.stub().callsFake(async () => new Promise(resolve => process.nextTick(() => {
                    // move emitDataDoneStub to next tick
                    // to make possible to test that emit('end') really wait's for job
                    emitDataDoneStub();
                    resolve();
                })));
                const onEndStub = sinon.stub().callsFake(async () => {
                    try {
                        expect(onDataStub).to.have.been.calledOnce.and.calledWith(data);
                        expect(onEndStub).to.have.been
                            .calledAfter(onDataStub)
                            .and.calledAfter(emitDataDoneStub)
                            .and.calledOnce;
                        expect(onErrorStub).not.to.have.been.called;
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                const triggerOrActionStub = sinon.stub().resolves(data);
                const payload = {};
                const cfg = {};
                const snapshot = {};
                taskExec
                    .on('error', onErrorStub)
                    .on('end', onEndStub)
                    .on('data', onDataStub);

                taskExec.process(
                    { process: triggerOrActionStub },
                    payload,
                    cfg,
                    snapshot
                );
            });
        });
    });
});
