const Flow = require('../models/Flow');

module.exports = ({ logger }) => async (event) => {
    try {
        const { payload } = event;
        const { id } = payload;
        const flow = await Flow.findById(id);
        if (!flow) {
            return event.ack();
        }
        Object.assign(flow, payload);
        flow.status = 'started';
        await flow.save();
        await event.ack();
    } catch (err) {
        logger.error({ err, event }, 'Unable to process event');
        await event.nack();
    }
};
