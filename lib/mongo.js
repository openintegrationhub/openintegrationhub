var debug = require('debug')('sailor');
var mongoose = require('mongoose');
var Q = require('q');

exports.MongoConnection = MongoConnection;

function MongoConnection() {

    var self = this;
    self.db = null;

    function connect(uri, callback) {

        mongoose.connect(uri);

        var db = mongoose.connection;
        db.once('open', mongoConnectionSuccess);
        db.on('error', mongoConnectionError);

        function mongoConnectionSuccess() {
            debug('Connected to MongoDB on %s', uri);
            self.db = db;
            callback();
        }

        function mongoConnectionError(err) {
            debug('Failed to connect to MongoDB on %s', uri);
            callback(err);
        }
    }

    function disconnect(callback) {
        mongoose.disconnect(function(){
            debug('Disconnected from MongoDB');
            callback();
        });
    }

    self.connect = function (uri) {
        return Q.nfcall(connect, uri);
    };

    self.disconnect = function () {
        return Q.nfcall(disconnect);
    };
}
