describe('Mongo', function () {

    var mongoose = require('mongoose');
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

    it('Should reject if failed to disconnect', function () {

        var mongo = new MongoConnection();
        var promise;

        spyOn(mongoose, 'disconnect').andCallFake(function(callback) {
            callback();
        });

        runs(function(){
            promise = mongo.disconnect();
        });

        waitsFor(function(){
            return promise.isFulfilled() || promise.isRejected();
        }, 10000);

        runs(function(){
            expect(promise.isFulfilled()).toEqual(true);
        });
    });

});
