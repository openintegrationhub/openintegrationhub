const { SchedulePublisher } = require('../../src/index');
const { expect } = require('chai');

describe('SchedulePublisher', () => {
    it('#findForScheduling', () => {
        const schedulePublisher = new SchedulePublisher();
        expect(typeof schedulePublisher.scheduleFlow).to.equal('function');
    });
});
