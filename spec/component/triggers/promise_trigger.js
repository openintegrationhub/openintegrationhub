exports.process = processTrigger;

function processTrigger(msg, cfg) {
    return Promise.resolve({
        body: 'I am a simple promise'
    });
}
