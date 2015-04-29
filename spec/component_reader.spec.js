describe('Component reader', function () {

    var ComponentReader = require('../lib/component_reader.js').ComponentReader;

    it('Should find component located on the path', function () {

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

    it('Should find component trigger', function () {

        var reader = new ComponentReader();
        var value;
        var promise = reader.init('/spec/component/').then(function(){
            return reader.findTriggerOrAction('passthrough').then(function(filename){
                value = filename;
            });
        });

        waitsFor(function(){
            return promise.isFulfilled() || promise.isRejected();
        }, 10000);

        runs(function(){
            expect(promise.isFulfilled()).toEqual(true);
            expect(reader.componentJson.title).toEqual('Client component');
            expect(value).toContain('triggers/passthrough.js');
        });
    });

    it('Should return error if trigger not found', function () {

        var reader = new ComponentReader();
        var value, error;
        var promise = reader.init('/spec/component/').then(function(){
            return reader.findTriggerOrAction('some-missing-component').then(function(filename){
                value = filename;
            }).fail(function(err){
                error = err;
                throw err;
            })
        });

        waitsFor(function(){
            return promise.isFulfilled() || promise.isRejected();
        }, 10000);

        runs(function(){
            expect(promise.isFulfilled()).toEqual(false);
            expect(error.message).toEqual('Trigger or action some-missing-component is not found in component.json!');
        });
    });

    it('Should return error if trigger not initialized', function () {

        var reader = new ComponentReader();
        var value, error;
        var promise = reader.findTriggerOrAction('some-missing-component').then(function(filename){
            value = filename;
        }).fail(function(err){
            error = err;
            throw err;
        });

        waitsFor(function(){
            return promise.isFulfilled() || promise.isRejected();
        }, 10000);

        runs(function(){
            expect(promise.isFulfilled()).toEqual(false);
            expect(error.message).toEqual("Component.json was not loaded");
        });
    });

});
