// Dependencies

var server = require('./lib/server');
var workers = require('./lib/workers');

// Declare the app

var app = {};

app.init = () => {
    //start server
    server.init();

    //start workers
    workers.init();
};

app.init();

module.exports = app;