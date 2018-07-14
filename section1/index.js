var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var https = require('https');
var fs = require('fs');

//Instantiate HTTP Server
var httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

httpServer.listen(config.httpPort, () => {
    console.log('ENVIRONMENT: ', config.envName);
    console.log('LISTENING ON PORT: ', config.httpPort);
});

//Instantiate HTTPS Server
var httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};

var httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, () => {
    console.log('ENVIRONMENT: ', config.envName);
    console.log('LISTENING ON PORT: ', config.httpsPort);
});

//Define the handlers
var handlers = {};

handlers.sample = (data, callback) => {
    //callback a http status code, and a payload which should be an object
    callback(406, {
        'name': 'my name is sample handler'
    });
};

handlers.notFound = (data, callback) => {
    callback(404);
};

handlers.ping = (data, callback) => {
    callback(200);
};

//Denfine a request router
var router = {
    'ping': handlers.ping,
    'sample': handlers.sample,
    'notFound': handlers.notFound
};


// All the server logic for both http and https server
var unifiedServer = (req, res) => {
    //Get Url and Parse it
    var parsedUrl = url.parse(req.url, true);

    //Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the HTTP Method
    var method = req.method;

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
        var choosenHandler = typeof (router[trimmedPath]) == 'undefined' ? router.notFound : router[trimmedPath];
        console.log('TYPE ', typeof (choosenHandler));

        var data = {
            trimmedPath: trimmedPath,
            queryStringObject: queryStringObject,
            method: method,
            headers: req.headers,
            payload: buffer
        };

        choosenHandler(data, (statusCode, payload) => {
            //use the status code called by the handler or default to 200
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
            payload = typeof (payload) == 'object' ? payload : {};

            //convert the payload to a string
            res.setHeader('Content-Type', 'application/json');
            var payloadString = JSON.stringify(payload);
            res.writeHead(statusCode);
            res.end(payloadString);
            console.log('RETURNING', statusCode, payload);
        });
    });
};