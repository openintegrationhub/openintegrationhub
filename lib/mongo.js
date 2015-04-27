var debug = require('debug')('sailor');
var mongoose = require('mongoose');
var Q = require('q');

var MongoConnection = function() {

    var self = this;
    self.db = null;

    self.connect = function (uri) {

        var deferred = Q.defer();

        mongoose.connect(uri);
        self.db = mongoose.connection;
        self.db.once('open', mongoConnectionSuccess);
        self.db.on('error', mongoConnectionError);

        function mongoConnectionSuccess() {
            debug('Connected to MongoDB on %s', uri);
            deferred.resolve();
        }

        function mongoConnectionError(err) {
            debug('Failed to connect to MongoDB on %s', uri);
            deferred.reject(err);
        }

        return deferred.promise;
    }
};

exports.MongoConnection = MongoConnection;
