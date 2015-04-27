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

        return promiseFile(self.componentPath + '/component.json').then(function(componentJson){
            debug('Successfully loaded component.json');
            self.componentJson = componentJson;
        })
    };

    self.findTriggerOrAction = function (name) {
        var data = null;
        if (self.componentJson.triggers && self.componentJson.triggers[name]) {
            data = self.componentJson.triggers[name];
        } else if (self.componentJson.actions && self.componentJson.actions[name]) {
            data = self.componentJson.actions[name];
        } else {
            return Q.reject(new Error('Trigger or action ' + name + 'does not exist!'));
        }
        return promiseFile(self.componentPath + '/' + data.main);
    };

    function promiseFile(filePath){
        var deferred = Q.defer();
        fs.exists(filePath, function (exists) {
            if (!exists) {
                deferred.reject(new Error('File ' + filePath + 'is not found!'));
                return;
            }
            try {
                var module = require(filePath);
                deferred.resolve(module);
            } catch (err) {
                deferred.reject(err);
            }
        });
        return deferred.promise;
    }
};

exports.ComponentReader = ComponentReader;
