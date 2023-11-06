const Flow = require('../models/Flow');

module.exports =
    ({ logger }) =>
    async (event) => {
        try {
            const { payload } = event;
            const flow = await Flow.findById(payload.id);
            if (flow) {
                flow.status = 'stopping';
                await flow.save();
            }
            await event.ack();
        } catch (err) {
            logger.error({ err, event }, 'Unable to process event');
            await event.nack();
        }
    };
