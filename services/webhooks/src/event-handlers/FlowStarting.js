const Flow = require('../models/Flow');

module.exports = ({logger, config }) => async (event) => {
    try {
        const { payload } = event;
        const { id } = payload;
        const ALLOW_RUN_SCHEDULED_FLOWS = config.get('ALLOW_RUN_SCHEDULED_FLOWS') === 'true';

        if (!ALLOW_RUN_SCHEDULED_FLOWS && payload.cron) {
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
