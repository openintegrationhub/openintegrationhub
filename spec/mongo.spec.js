describe('Mongo', function () {

    var MongoConnection = require('../lib/mongo.js').MongoConnection;

    it('Should reject if failed to connect', function () {

        var mongo = new MongoConnection();
        var error = null;
        var promise;

        runs(function(){
            promise = mongo.connect('http://test.com').fail(function(err){
                error = err;
            });
        });

        waitsFor(function(){
            return promise.isFulfilled() || promise.isRejected();
        }, 10000);

        runs(function(){
            expect(error.message).toContain('Invalid mongodb uri.');
        });
    });

});
