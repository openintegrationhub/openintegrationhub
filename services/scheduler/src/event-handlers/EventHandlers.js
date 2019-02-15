module.exports = ({eventBus, flowStarted, flowStopped}) => {
    const handlers = {
        'flow.started': flowStarted,
        'flow.stopped': flowStopped
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
