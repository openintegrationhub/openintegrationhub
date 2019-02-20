module.exports = ({eventBus, flowStarting, flowStarted, flowStopping}) => {
    const handlers = {
        'flow.starting': flowStarting,
        'flow.started': flowStarted,
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
