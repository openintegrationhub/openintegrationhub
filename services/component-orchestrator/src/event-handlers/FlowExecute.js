module.exports =
    ({ logger, componentOrchestrator }) =>
    async (event) => {
        try {
            const { payload, headers } = event;

            await componentOrchestrator.executeFlow(payload, headers);

            await event.ack();
        } catch (err) {
            logger.error({ err, event }, 'Unable to process event');
            await event.nack();
        }
    };
