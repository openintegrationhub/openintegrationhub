// it should connect to rabbitmq
// then connect to mongo
// listen incoming messages
// and run client component

var init = require('./lib/init.js').init;

init(function(err, connections) {
    if (err) {
        // @TODO how do we report errors?
        return;
    }

});

