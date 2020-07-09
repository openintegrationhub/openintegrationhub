var log = require('./logging.js');
var Q = require('q');
var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var util = require('util');

function ComponentReader() {
    this.componentPath = null;
    this.componentJson = null;
}

ComponentReader.prototype.init = function init(componentPath) {
    this.componentPath = path.join(process.cwd(), componentPath || '');
    log.debug('Component path is: %s', this.componentPath);

    log.trace('Root files: %j', fs.readdirSync(this.componentPath));

    var componentJsonPath = path.join(this.componentPath, 'component.json');
    return this.promiseLoadJson(componentJsonPath);
};

ComponentReader.prototype.promiseLoadJson = function promiseLoadJson(jsonFilePath) {
    try {
        this.componentJson = require(jsonFilePath);
        log.debug('Successfully loaded %s', jsonFilePath);
        log.debug('Triggers: %j', _.keys(this.componentJson.triggers));
        log.debug('Actions: %j', _.keys(this.componentJson.actions));
        return Q.resolve();
    } catch (err) {
        return Q.reject(new Error('Failed to load component.json from ' + this.componentPath));
    }
};

ComponentReader.prototype.findTriggerOrAction = function findTriggerOrAction(name) {
    if (this.componentJson === null) {
        throw new Error('Component.json was not loaded');
    }

    if (this.componentJson.triggers && this.componentJson.triggers[name]) {
        return this.componentJson.triggers[name].main;
    } else if (this.componentJson.actions && this.componentJson.actions[name]) {
        return this.componentJson.actions[name].main;
    } else {
        throw new Error('Trigger or action "' + name + '" is not found in component.json!');
    }
};

ComponentReader.prototype.loadTriggerOrAction = function loadTriggerOrAction(name) {
    var filename;
    var modulePath;
    var result;

    try {
        filename = this.findTriggerOrAction(name);
        modulePath = path.join(this.componentPath, filename);
    } catch (err) {
        log.trace(err);
        return Q.reject(err);
    }

    try {
        log.trace('Trying to find module at: %s', modulePath);
        result = require(modulePath);
        return Q.resolve(result);
    } catch (err) {
        var message;

        if (err.code === 'MODULE_NOT_FOUND') {
            message = 'Failed to load file \'%s\': %s';
            err.message = util.format(message, filename, err.message);
        } else {
            message = 'Trigger or action \'%s\' is found, but can not be loaded. '
                + 'Please check if the file \'%s\' is correct.';
            err.message = util.format(message, name, filename);
        }

        log.trace(err);
        return Q.reject(err);
    }
};

ComponentReader.prototype.loadVerifyCredentials = function loadVerifyCredentials() {
    function verifyStub(cfg, cb) {
        return cb(null, { verified: true });
    }

    try {
        var modulePath = path.join(this.componentPath, 'verifyCredentials');
        log.trace('Trying to find verifyCredentials.js at: %s', modulePath);
        var verifyFunc = require(modulePath);
        return Q.resolve(verifyFunc);
    } catch (err) {
        log.trace(err);
        return Q.resolve(verifyStub);
    }
};

exports.ComponentReader = ComponentReader;
