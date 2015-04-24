var events = require("events");
var debug = require('debug')('sailor');
var _ = require("lodash");
var util = require("util");
var ComponentReader = require("./component_reader.js").ComponentReader;

var Scope = function(){
    events.EventEmitter.call(this);
};

util.inherits(Scope, events.EventEmitter);

var Executor = function() {

    var executor = this;
    var componentReader = new ComponentReader();

    events.EventEmitter.call(this);

    Executor.prototype.processMessage = function(triggerOrAction, message, cb) {
        debug("Process message for %s", triggerOrAction);
        componentReader.findTriggerOrAction(triggerOrAction, function(err, module){
            if (err) {
                cb(err);
            }
            doProcessMessage(module, message, cb);
        });
    };

    function doProcessMessage(module, message, cb) {

        var scope = new Scope();
        scope.on('data', processEvent.bind(null, 'data'));
        scope.on('snapshot', processEvent.bind(null, 'snapshot'));
        scope.on('rebound', processEvent.bind(null, 'rebound'));
        scope.on('error', processEvent.bind(null, 'error'));
        scope.on('end', processEvent.bind(null, 'end'));

        var cfg = {};
        var snapshot = {};

        function next(msg, cfg, snapshot){
            processEvent('data', msg);
            processEvent('snapshot', snapshot);
        }

        try {
            module.process.apply(scope, [message, cfg, next, snapshot]);
        } catch (err) {
            processEvent('error', err);
            cb(err);
        }

        function processEvent(name, value){
            executor.emit(name, value);
        }
    }
};

util.inherits(Executor, events.EventEmitter);

exports.Executor = Executor;
