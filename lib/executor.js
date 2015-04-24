var events = require("events");
var util = require("util");
var debug = require('debug')('sailor');
var _ = require("lodash");
var fs = require("fs");

var Executor = function() {
    events.EventEmitter.call(this);
    this.componentPath = process.cwd() + '/' + process.env.COMPONENT_PATH;
    this.parseComponentJson();
};

util.inherits(Executor, events.EventEmitter);

Executor.prototype.parseComponentJson = function() {
    this.componentJson = require(this.componentPath + '/component.json');
};

Executor.prototype.getTriggerOrAction = function(name) {
    if (this.componentJson.triggers[name]) {
        return this.componentJson.triggers[name];
    }
    if (this.componentJson.actions[name]) {
        return this.componentJson.actions[name];
    }
};

Executor.prototype.loadTriggerOrAction = function(name, cb) {

    var triggerOrAction = this.getTriggerOrAction(name);

    if (!triggerOrAction) {
        return cb(new Error('Trigger or action does not exist!'));
    }

    var filePath = this.componentPath + '/' + triggerOrAction.main;

    fs.exists(filePath, function(fileExists) {
        if (!fileExists) {
            return cb(new Error('Trigger or action main file does not exist!'));
        }
        var module = require(filePath);
        if (typeof(module['process']) != 'function') {
            return cb(new Error('Trigger or action main has no processing function!'));
        }
        cb(null, module);
    });
};

Executor.prototype.processMessage = function(triggerOrAction, message, cb) {

    debug("Process message for %s", triggerOrAction);

    this.loadTriggerOrAction(triggerOrAction, function(err, module){
        if (err) {
            cb(err);
        }

        var scope = {};

        var cfg = {};
        var snapshot = {};
        var next = function(){
        };

        module.process.apply(scope, [message, step.configuration, next, snapshot]);
    });
};


exports.Executor = Executor;
