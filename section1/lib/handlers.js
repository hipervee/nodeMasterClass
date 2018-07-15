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

handlers.tokens = (data, callback) => {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
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
        //Get the token from the headers
        var token = typeof (data.headers.token == 'string') ? data.headers.token : false;
        handlers._tokens.verifyToken(token, phone, (isValid) => {
            if (isValid) {
                _data.read('users', phone, (err, userData) => {
                    if (!err && userData) {
                        delete userData.hashedPassword;
                        callback(200, userData);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(400, {
                    error: 'Invalid Auth Token'
                });
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
            var token = typeof (data.headers.token == 'string') ? data.headers.token : false;
            handlers._tokens.verifyToken(token, phone, (isValid) => {
                if (isValid) {
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
                    callback(403, {
                        error: 'Invalid Auth Token'
                    });
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
        var token = typeof (data.headers.token == 'string') ? data.headers.token : false;
        handlers._tokens.verifyToken(token, phone, (isValid) => {
            if (isValid) {
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
                callback(403, {
                    error: 'Invalid Auth Token'
                });
            }
        });

    } else {
        callback(400, {
            error: 'invalid/missing required field'
        });
    }
};


handlers._tokens = {};

//tokens: post
//Required: phone and password
handlers._tokens.post = (data, callback) => {
    //check all required fields are filled out
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password) {
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                //Hash sent passowrd and compare it to the password stored in user object
                var hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    //if valid create a token with a random name, set expiration data 1 hour in the future

                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;

                    var tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };
                    _data.create('tokens', tokenId, tokenObject, (err) => {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, {
                                error: 'could not create a new token'
                            });
                        }
                    });
                } else {
                    callback(400, {
                        error: 'Invalid credentials'
                    });
                }
            } else {
                callback(400, {
                    error: 'Could not find user'
                });
            }
        });
    } else {
        callback(400, {
            'error': 'missing required fields'
        });
    }
};


//tokens: get
//required data: tokenId
//optional data: none
handlers._tokens.get = (data, callback) => {
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {
            error: 'invalid/missing required field'
        });
    }
};


//tokens - pu
//required fields: id and extend
//optional data: none
handlers._tokens.put = (data, callback) => {
    var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend;
    console.log('debug', id, extend);
    if (id && extend) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    _data.update('tokens', id, tokenData, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(400, {
                                error: 'unable to extend token'
                            });
                        }
                    });
                } else {

                    callback(400, {
                        error: 'token already expired, cannot extend'
                    });
                }
            } else {

                callback(400, {
                    error: 'unable to identity token'
                });
            }

        });
    } else {
        callback(400, {
            error: 'invalid fields'
        });
    }

};

//tokens: delete
//required data: id
//optional data: none
handlers._tokens.delete = (data, callback) => {
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                _data.delete('tokens', id, (err) => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, {
                            error: 'unable to delete token'
                        });
                    }
                });
            } else {
                callback(400, 'unable to identity token');
            }
        });
    } else {
        callback(400, {
            error: 'invalid/missing required field'
        });
    }
};

// Verify if the given token is currrently valid for current user
handlers._tokens.verifyToken = (id, phone, callback) => {
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            //check if token is for the given user
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

module.exports = handlers;