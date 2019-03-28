const Flow = require('../models/Flow');

module.exports = ({logger}) => async (event) => {
    try {
        const { payload } = event;
        await Flow.deleteOne({_id: payload.id});
        await event.ack();
    } catch (err) {
        logger.error({ err, event }, 'Unable to process event');
        await event.nack();
    }
};
