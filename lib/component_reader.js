var logging = require('./logging.js');
var info = logging.info;
var debug = logging.debug;
var Q = require('q');
var _ = require('lodash');

exports.ComponentReader = ComponentReader;

function ComponentReader() {
    this.componentPath = null;
    this.componentJson = null;
}

ComponentReader.prototype.init = function init(componentPath) {
    this.componentPath = process.cwd() + '/' + componentPath;
    info('Component path is: %s', this.componentPath);

    var componentJsonPath = this.componentPath + '/component.json';
    return this.promiseLoadJson(componentJsonPath);
};

ComponentReader.prototype.promiseLoadJson = function promiseLoadJson(jsonFilePath) {
    try {
        this.componentJson = require(jsonFilePath);
        info('Successfully loaded %s', jsonFilePath);
        info('Triggers: %j', _.keys(this.componentJson.triggers));
        info('Actions: %j', _.keys(this.componentJson.actions));
        return Q.resolve();
    } catch (err) {
        return Q.reject(err);
    }
};

ComponentReader.prototype.findTriggerOrAction = function(name) {
    if (this.componentJson === null) {
        throw new Error('Component.json was not loaded');
    }

    if (this.componentJson.triggers && this.componentJson.triggers[name]) {
        return this.componentJson.triggers[name].main;
    } else if (this.componentJson.actions && this.componentJson.actions[name]) {
        return this.componentJson.actions[name].main;
    } else {
        throw new Error('Trigger or action ' + name + ' is not found in component.json!');
    }
};

ComponentReader.prototype.loadTriggerOrAction = function loadTriggerOrAction(name) {
    try {
        var filename = this.findTriggerOrAction(name);
        var result = require(this.componentPath + "/" + filename);
        return Q.resolve(result);
    } catch (err) {
        return Q.reject(err);
    }
};
