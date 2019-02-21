module.exports = ({eventBus, flowStarting, flowStopping}) => {
    const handlers = {
        'flow.starting': flowStarting,
        'flow.stopping': flowStopping
    };

    for (let [topic, handler] of Object.entries(handlers)) {
        eventBus.subscribe(topic, handler);
    }

    return {
        connect() {
            return eventBus.connect();
        }
    };
};
