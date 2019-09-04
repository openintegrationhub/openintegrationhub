const chai = require('chai');
const { expect } = chai;

const TaskExec = require('../../lib/executor.js').TaskExec;

describe('Executor', () => {
    describe('#constructor', () => {
        it('should be constructable without arguments', () => {
            const taskexec = new TaskExec();
            expect(taskexec).to.be.instanceof(TaskExec);
        });
        it('should properly store variables', () => {
            const vars = {
                var1: 'val1',
                var2: 'val2'
            };
            const taskexec = new TaskExec({ variables: vars });
            expect(taskexec._variables).to.deep.equal(vars);
        });
    });
    describe('getVariables', () => {
        it('should return flow variables', () => {
            const vars = {
                var1: 'val1',
                var2: 'val2'
            };
            const taskexec = new TaskExec({ variables: vars });
            expect(taskexec.getFlowVariables()).to.deep.equal(vars);
        });
    });
});
