module.exports = ({ eventBus, flowStarting, flowStopping, flowExecute, componentStarting, componentStopping }) => {
    const handlers = {
        'flow.starting': flowStarting,
        'flow.stopping': flowStopping,
        'flow.execute': flowExecute,
        'component.starting': componentStarting,
        'component.stopping': componentStopping,
    };

    for (let [topic, handler] of Object.entries(handlers)) {
        eventBus.subscribe(topic, handler);
    }

    return {
        connect() {
            return eventBus.connect();
        },
    };
};
