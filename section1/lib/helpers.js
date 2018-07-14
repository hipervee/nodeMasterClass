var crypto = require('crypto');
var config = require('./config');

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



module.exports = helpers;