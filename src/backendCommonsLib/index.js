module.exports = {
    App: require('./src/App.js'),
    Flow : require('./src/Flow.js'),
    QueueCreator: require('./src/QueueCreator.js'),
    AMQPService: require('./src/AMQPService.js'),
    K8sService: require('./src/K8sService.js'),
    errors: require('./src/errors.js'),
    FlowCRD: require('./data/FlowCRD.json'),
    SchedulerCRD: require('./data/SchedulerCRD.json')
};
