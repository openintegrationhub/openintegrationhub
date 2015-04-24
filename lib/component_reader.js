var fs = require("fs");

var ComponentReader = function(){

    var componentPath = process.cwd() + '/' + process.env.COMPONENT_PATH;
    var componentJson = readComponentJson();

    function readComponentJson() {
        // @TODO process errors
        return require(componentPath + '/component.json');
    }

    function getTriggerOrAction(name) {
        if (componentJson.triggers[name]) {
            return componentJson.triggers[name];
        }
        if (componentJson.actions[name]) {
            return componentJson.actions[name];
        }
    }

    function findTriggerOrAction(name, cb) {
        var triggerOrAction = getTriggerOrAction(name);
        if (!triggerOrAction) {
            return cb(new Error('Trigger or action does not exist!'));
        }

        var filePath = componentPath + '/' + triggerOrAction.main;
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
    }

    return {
        findTriggerOrAction: findTriggerOrAction
    }
};

exports.ComponentReader = ComponentReader;
