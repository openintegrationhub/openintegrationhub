describe('Component reader', function () {

    var ComponentReader = require('../lib/component_reader.js').ComponentReader;

    it('Should find component located on the path', function() {

        var reader = new ComponentReader();
        var promise = reader.init('/spec/component/');

        waitsFor(function(){
            return promise.isFulfilled() || promise.isRejected();
        }, 10000);

        runs(function(){
            expect(promise.isFulfilled()).toEqual(true);
            expect(reader.componentJson.title).toEqual('Client component');
        });
    });

    it('Should find component trigger', function() {

        var reader = new ComponentReader();
        var filename, error;
        reader.init('/spec/component/').then(function(){
            try {
                filename = reader.findTriggerOrAction('passthrough');
            } catch (err) {
                error = err;
            }
        });

        waitsFor(function(){
            return filename || error;
        }, 10000);

        runs(function(){
            expect(reader.componentJson.title).toEqual('Client component');
            expect(filename).toContain('triggers/passthrough.js');
        });
    });

    it('Should return error if trigger not found', function() {

        var reader = new ComponentReader();
        var filename, error;

        reader.init('/spec/component/').then(function(){
            try {
                filename = reader.findTriggerOrAction('some-missing-component');
            } catch (err) {
                error = err;
            }
        });

        waitsFor(function(){
            return filename || error;
        }, 10000);

        runs(function(){
            expect(error.message).toEqual('Trigger or action "some-missing-component" is not found in component.json!');
        });
    });

    it('Should return appropriate error if trigger file is missing', function() {

        var reader = new ComponentReader();

        var promise = reader.init('/spec/component/').then(function(){
            return reader.loadTriggerOrAction('missing_trigger');
        });

        waitsFor(function(){
            return promise.isFulfilled() || promise.isRejected();
        }, 10000);

        runs(function(){
            expect(promise.isRejected()).toEqual(true);
            var err = promise.inspect().reason;
            expect(err.message).toEqual(
                "Trigger or action 'missing_trigger' is not found. " +
                "Please check if the path you specified in component.json ('./triggers/missing_trigger.js') is valid."
            );
            expect(err.code).toEqual('MODULE_NOT_FOUND');
        });
    });

    it('Should return appropriate error if trigger file is presented, but contains syntax error', function() {

        var reader = new ComponentReader();

        var promise = reader.init('/spec/component/').then(function() {
            return reader.loadTriggerOrAction('syntax_error_trigger');
        });

        waitsFor(function() {
            return promise.isFulfilled() || promise.isRejected();
        }, 10000);

        runs(function() {
            expect(promise.isRejected()).toEqual(true);
            var err = promise.inspect().reason;
            expect(err.message).toEqual(
                "Trigger or action 'syntax_error_trigger' is found, but can not be loaded. " +
                "Please check if the file './triggers/syntax_error_trigger.js' is correct."
            );
        });
    });

    it('Should return error if trigger not initialized', function() {

        var reader = new ComponentReader();
        var filename, error;

        try {
            filename = reader.findTriggerOrAction('some-missing-component');
        } catch (err) {
            error = err;
        }

        waitsFor(function(){
            return filename || error;
        }, 10000);

        runs(function(){
            expect(error.message).toEqual("Component.json was not loaded");
        });
    });

});
