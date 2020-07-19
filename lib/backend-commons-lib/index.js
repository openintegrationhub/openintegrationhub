module.exports = {
    App: require('./src/App.js'),
    QueueCreator: require('./src/QueueCreator.js'),
    QueuePubSub: require('./src/QueuePubSub.js'),
    AMQPService: require('./src/AMQPService.js'),
    K8sService: require('./src/K8sService.js'),
    errors: require('./src/errors.js')
};
