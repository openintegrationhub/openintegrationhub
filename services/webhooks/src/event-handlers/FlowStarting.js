const Flow = require('../models/Flow');

module.exports = ({logger}) => async (event) => {
    try {
        const { payload } = event;
        const { id } = payload;

        if (payload.cron) {
            await Flow.deleteOne({_id: id});
        } else {
            let flow = await Flow.findById(id);
            if (!flow) {
                flow = new Flow({_id: id});
            }
            Object.assign(flow, payload);
            flow.status = 'starting'; //@todo: maybe remove this
            await flow.save();
        }
        await event.ack();
    } catch (err) {
        logger.error({ err, event }, 'Unable to process event');
        await event.nack();
    }
};
