// it should connect to rabbitmq
// then connect to mongo
// listen incoming messages
// and run client component

var Sailor = require('./lib/sailor.js').Sailor;
var Executor = require('./lib/executor.js').Executor;

var sailor = new Sailor();
var executor = new Executor();

sailor.init(function(err){

    sailor.listen(executor);

    sailor.on('message', function(message) {
        executor.processMessage("updateCustomer", message)
    });

});

