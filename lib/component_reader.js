var debug = require('debug')('sailor');
var fs = require('fs');
var Q = require('q');

exports.ComponentReader = ComponentReader;

function ComponentReader() {

    this.componentPath = null;
    this.componentJson = null;

    this.init = function init(componentPath) {

        this.componentPath = process.cwd() + '/' + componentPath;
        debug('Component path is: %s', this.componentPath);

        var self = this;
        return loadFile(this.componentPath + '/component.json').then(function loadSuccess(componentJson) {
            debug('Successfully loaded component.json');
            self.componentJson = componentJson;
        });
    };

    this.findTriggerOrAction = function findTriggerOrAction(name) {

        if (this.componentJson === null) {
            return Q.reject(new Error('Component.json was not loaded'));
        }

        var data = null;
        if (this.componentJson.triggers && this.componentJson.triggers[name]) {
            data = this.componentJson.triggers[name];
        } else if (this.componentJson.actions && this.componentJson.actions[name]) {
            data = this.componentJson.actions[name];
        } else {
            return Q.reject(new Error('Trigger or action ' + name + ' is not found in component.json!'));
        }

        return checkFileExists(this.componentPath + '/' + data.main);
    };

    this.loadTriggerOrAction = function findTriggerOrAction(name) {
        return this.findTriggerOrAction(name).then(loadFile);
    };
}

function checkFileExists(filePath) {
    var deferred = Q.defer();
    fs.exists(filePath, function (exists) {
        if (!exists) {
            deferred.reject(new Error('File ' + filePath + 'is not found!'));
        } else {
            deferred.resolve(filePath);
        }
    });
    return deferred.promise;
}

function loadFile(filePath) {
    var deferred = Q.defer();
    try {
        var module = require(filePath);
        deferred.resolve(module);
    } catch (err) {
        deferred.reject(err);
    }
    return deferred.promise;
}
