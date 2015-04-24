var events = require("events");
var util = require("util");

var Executor = function() {
    events.EventEmitter.call(this);
    this.json = require('./../' + process.env.COMPONENT_PATH + '/component.json');
};

util.inherits(Executor, events.EventEmitter);

Executor.prototype.processMessage = function(message) {
    var stepId = message.headers.stepId;
};

exports.Executor = Executor;
