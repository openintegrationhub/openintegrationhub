const chai = require('chai');
const { expect } = chai;

const TaskExec = require('../../lib/executor.js').TaskExec;

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
    describe('getApiClient', () => {
        it('should return api client', () => {
            const taskExec = new TaskExec(defaultTaskExecArgs);
            expect(taskExec.getApiClient()).to.equal(defaultTaskExecArgs.services.apiClient);
        });
    });
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
});
