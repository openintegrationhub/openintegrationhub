var debug = require('debug')('sailor');
var mongoose = require('mongoose');
var Q = require('q');

var MongoConnection = function() {

    var self = this;
    self.db = null;

    function connect(uri, callback) {

        mongoose.connect(uri);

        var db = mongoose.connection;
        db.once('open', mongoConnectionSuccess);
        db.on('error', mongoConnectionError);

        function mongoConnectionSuccess() {
            debug('Connected to MongoDB on %s', uri);
            callback(null, db);
        }

        function mongoConnectionError(err) {
            debug('Failed to connect to MongoDB on %s', uri);
            callback(err);
        }
    }

    self.connect = function(uri){
        return Q.nfcall(connect, uri).then(function(db){
            self.db = db;
        })
    }
};

exports.MongoConnection = MongoConnection;
