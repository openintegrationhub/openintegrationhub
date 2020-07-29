module.exports = ({ logger, componentOrchestrator }) => async (event) => {
    try {
      const { payload } = event;
      console.log('process event')
      await componentOrchestrator.startComponent(payload.component)

      await event.ack();
    } catch (err) {
      logger.error({ err, event }, 'Unable to process event');
      await event.nack();
    }
  };
