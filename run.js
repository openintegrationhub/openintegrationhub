var debug = require('debug')('sailor');
var Sailor = require('./lib/sailor.js').Sailor;

sailor = new Sailor();

sailor.connect()
    .then(function(){
        sailor.run();
    })
    .fail(function(err){
        console.log(err);
    })
    .done();




