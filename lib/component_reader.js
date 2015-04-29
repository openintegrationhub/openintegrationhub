var debug = require('debug')('sailor');
var fs = require("fs");
var Q = require("q");

var ComponentReader = function(){

    var self = this;
    self.componentPath = null;
    self.componentJson = null;

    self.init = function init(componentPath) {

        self.componentPath = process.cwd() + '/' + componentPath;
        debug('Component path is: %s', self.componentPath);

        return loadFile(self.componentPath + '/component.json').then(function(componentJson){
            debug('Successfully loaded component.json');
            self.componentJson = componentJson;
        }).fail(function(err) {
            debug('Failed to load component.json: %s', err.message);
        });
    };

    self.findTriggerOrAction = function findTriggerOrAction(name) {

        if (self.componentJson === null) {
            return Q.reject(new Error("Component.json was not loaded"));
        }

        var data = null;
        if (self.componentJson.triggers && self.componentJson.triggers[name]) {
            data = self.componentJson.triggers[name];
        } else if (self.componentJson.actions && self.componentJson.actions[name]) {
            data = self.componentJson.actions[name];
        } else {
            return Q.reject(new Error('Trigger or action ' + name + ' is not found in component.json!'));
        }

        return checkFileExists(self.componentPath + '/' + data.main);
    };

    self.loadTriggerOrAction = function findTriggerOrAction(name) {
        return self.findTriggerOrAction(name).then(loadFile);
    };

    function checkFileExists(filePath){
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
};

exports.ComponentReader = ComponentReader;
