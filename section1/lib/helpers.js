var crypto = require('crypto');
var config = require('./config');
var queryString = require('querystring');
var https = require('https');

var helpers = {};

//Creates a SHA-256 hash
helpers.hash = (str) => {
    if (typeof (str) == 'string' && str.length > 0) {
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

helpers.parseJsonToObject = (payload) => {
    try {
        var jsonObject = JSON.parse(payload);
        return jsonObject;
    } catch (e) {
        return {};
    }
};

//Create random string of alpha characters
helpers.createRandomString = (strLength) => {
    strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        var possibleChars = 'qwertyuiopasdfghjklzxcvbnm0123456789';
        var str = '';
        for (var i = 0; i < strLength; i++) {
            var randomChar = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
            str += randomChar;
        }
        return str;
    } else {
        return false;
    }
};

//Send an sms via Twilio
helpers.sendTwilioSms = (phone, message, callback) => {
    //validate params
    phone = typeof (phone) == 'string' && phone.length == 10 ? phone : false;
    message = typeof (message) == 'string' && message.length > 0 && message.length < 160 ? message : false;

    if (phone && message) {
        //configure the request payload
        var payload = {
            'From': config.twilio.fromPhone,
            'To': '+1' + phone,
            'Body': message
        };

        //configure the request details
        var stringPayload = queryString.stringify(payload);

        //create request details
        var requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        //Instantiate Request Object
        var req = https.request(requestDetails, (response) => {
            //Grab the status of the sent rquest
            var status = response.statusCode;
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('status code returned ' + status);
            }
        });

        //Bind to the error event
        req.on('error', (e) => {
            callback(e);
        });

        //add payload
        req.write(stringPayload);

        //end the request
        req.end();
    } else {
        callback('given parameters missing or invalid');
    }
};


module.exports = helpers;