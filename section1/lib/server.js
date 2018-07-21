/*
These are server related tasks
*/

var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var https = require('https');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers')
var path = require('path');
var util = require('util');
var debug = console.log;//util.debuglog('server');

//instantiare server module object

var server = {};

//Instantiate HTTPS Server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res);
});

//Instantiate HTTP Server
server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

server.init = () => {
    server.httpServer.listen(config.httpPort, () => {
        let msg = `ENVIRONMENT: ${config.envName} running on PORT: ${config.httpPort}`;
        console.log('\x1b[34m%s\x1b[0m', msg);
    });

    server.httpsServer.listen(config.httpsPort, () => {
        let msg = `ENVIRONMENT: ${config.envName} running on PORT: ${config.httpsPort}`;
        console.log('\x1b[34m%s\x1b[0m', msg);
    });
};



//Denfine a request router
server.router = {
    'ping': handlers.ping,
    'sample': handlers.sample,
    'notFound': handlers.notFound,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
};


// All the server logic for both http and https server
server.unifiedServer = (req, res) => {
    //Get Url and Parse it
    var parsedUrl = url.parse(req.url, true);

    //Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the HTTP Method
    var method = req.method.toLowerCase();

    //Get the query string
    var queryStringObject = parsedUrl.query;

    //Get the payload if there is any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';

    req.on('data', (data) => {
        buffer += decoder.write(data);
    });

    req.on('end', () => {
        buffer += decoder.end();
        //choose the handler this request should go to
        debug('Trimmed Path', trimmedPath);
        var choosenHandler = typeof (server.router[trimmedPath]) == 'undefined' ? server.router.notFound : server.router[trimmedPath];
        var data = {
            trimmedPath: trimmedPath,
            queryStringObject: queryStringObject,
            method: method,
            headers: req.headers,
            payload: helpers.parseJsonToObject(buffer)
        };

        choosenHandler(data, (statusCode, payload) => {
            //use the status code called by the handler or default to 200
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
            payload = typeof (payload) == 'object' ? payload : {
                resp: payload
            };

            //convert the payload to a string
            res.setHeader('Content-Type', 'application/json');
            var payloadString = JSON.stringify(payload);
            res.writeHead(statusCode);
            res.end(payloadString);

            let msg = `${method.toUpperCase()} /${trimmedPath} ${statusCode}`;
            if ([200, 201].indexOf(statusCode) > -1) {
                debug('\x1b[32m%s\x1b[0m', msg);
            } else {
                debug('\x1b[31m%s\x1b[0m', msg);
            }
        });
    });
};
module.exports = server;