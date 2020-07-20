module.exports = ({ eventBus, flowStarting, flowStopping, flowExecute }) => {
    const handlers = {
        'flow.starting': flowStarting,
        'flow.stopping': flowStopping,
        'flow.execute': flowExecute
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
