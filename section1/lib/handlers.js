// Dependencies
var _data = require('./data');
var helpers = require('./helpers');

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

handlers.users = (data, callback) => {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._users = {};
//Required Data: firstName, lastName, phone, password, tosAgreement
handlers._users.post = (data, callback) => {
    //check all required fields are filled out
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? data.payload.tosAgreement : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        //Make sure that the user doesn't already exist
        _data.read('users', phone, (err, data) => {
            if (err) {
                //hash the password
                var hashedPassword = helpers.hash(password);
                if (hashedPassword) {
                    //create user object 
                    var user = {
                        firstName: firstName,
                        lastName: lastName,
                        phone: phone,
                        hashedPassword: hashedPassword,
                        tosAgreement: tosAgreement
                    };

                    _data.create('users', phone, user, (err) => {
                        if (!err) {
                            callback(201);
                        } else {
                            console.log(err);
                            callback(500, 'Could not create user, error: ' + err);
                        }
                    });
                } else {
                    callback(500, 'Could not hash the user password');
                }

            } else {
                callback(400, 'A user with this phone ' + phone + ' number already exists, ERROR: ' + err);
            }
        });

    } else {
        callback(400, 'Error: Missing required fields');
    }
};
//Users -get
//Required data: phone
//Optional Data: none
//@TODO Only let an authenticated user access their object
handlers._users.get = (data, callback) => {
    //check if the phone number is valid
    var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        _data.read('users', phone, (err, data) => {
            if (!err && data) {
                delete data.hashedPassword;
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {
            'error': 'missing required field'
        });
    }
};
//Users PUT
//Required Data: phone
//Optional Data: Everything else
//@TODO only let an authenticated user update their object
handlers._users.put = (data, callback) => {
    // check for required field
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? data.payload.tosAgreement : false;
    if (phone) {
        if (firstName || lastName || password) {
            _data.read('users', phone, (err, userData) => {
                if (!err && userData) {
                    userData.firstName = firstName || userData.firstName;
                    userData.lastName = lastName || userData.lastName;
                    userData.hashedPassword = (password && helpers.hash(password)) || userData.hashedPassword;

                    _data.update('users', phone, userData, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {
                                'error': 'unable to update user'
                            });
                        }
                    });
                } else {
                    callback(400, {
                        'error': 'the specified user does not exist'
                    })
                }
            });
        } else {
            callback(400, {
                'error': 'missing fields'
            });
        }
    } else {
        callback(400, {
            'error': 'missing required field'
        });
    }

};

//Users - DELETE
//Required data: phone
//Optional Data: none
//@TODO Only let an authenticated user delete their object
handlers._users.delete = (data, callback) => {
    var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        _data.read('users', phone, (err, data) => {
            if (!err && data) {
                _data.delete('users', phone, (err) => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, {
                            error: 'unable to delete user'
                        });
                    }
                });
            } else {
                callback(400, 'unable to identity user');
            }
        });
    } else {
        callback(400, {
            error: 'invalid/missing required field'
        });
    }
};

module.exports = handlers;