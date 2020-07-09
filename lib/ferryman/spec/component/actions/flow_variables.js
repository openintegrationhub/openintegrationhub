exports.process = processTrigger;

function processTrigger(msg, cfg) {
    this.emit('data', { body: this.getFlowVariables() });
    this.emit('end');
}
