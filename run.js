var debug = require('debug')('sailor');
var sailor = require('./lib/sailor.js');

sailor.connect()
    .then(sailor.run)
    .fail()




