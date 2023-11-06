module.exports =
    ({ logger, componentOrchestrator }) =>
    async (event) => {
        try {
            const { payload } = event;
            await componentOrchestrator.startComponent(payload);

            await event.ack();
        } catch (err) {
            logger.error({ err, event }, 'Unable to process event');
            await event.nack();
        }
    };
