const { FlowsDao, Scheduler, SchedulePublisher } = require('../../src/index');
const { assert } = require('chai');

describe('index', () => {
    it('should expose FlowsDao', () => {
        assert.equal(FlowsDao, require('../../src/flows-dao'));
    });

    it('should expose Scheduler', () => {
        assert.equal(Scheduler, require('../../src/scheduler'));
    });

    it('should expose SchedulePublisher', () => {
        assert.equal(SchedulePublisher, require('../../src/schedule-publisher'));
    });
});
