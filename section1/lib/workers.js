/*
These are worker related tasks
*/

var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
var _logs = require('./log');

var workers = {};


//Timer to excute worker process once per minute
workers.loop = () => {
    var interval = setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 5);
};

workers.gatherAllChecks = () => {
    //get all the checks that exist in the system
    var checks = _data.list('checks', (err, checks) => {
        if (!err && checks && checks.length) {
            checks.forEach(check => {
                //Read the check data
                _data.read('checks', check, (err, originalCheckData) => {
                    if (!err && originalCheckData) {
                        //pass it to the check validater and let that function continue of log error
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log('Error: reading one of the checks data: ' + check);
                    }
                });
            });
        } else {
            console.log('Error: Could not find any checks to process');
        }
    });
};

//Validate a check
workers.validateCheckData = (originalCheckData) => {
    originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {};
    originalCheckData.id = typeof (originalCheckData.id) == 'string' && originalCheckData.id.trim().length ? originalCheckData.id.trim() : false;
    originalCheckData.phone = typeof (originalCheckData.phone) == 'string' && originalCheckData.phone.trim().length == 10 ? originalCheckData.phone.trim() : false;
    originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['get', 'put', 'post', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.url = typeof (originalCheckData.url) == 'string' && originalCheckData.url.trim().length ? originalCheckData.url.trim() : false;
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds > 0 && originalCheckData.timeoutSeconds < 6 ? originalCheckData.timeoutSeconds : false;

    // set the keys that may not be set (if the workers are seeing this check for the first time)
    originalCheckData.state = typeof (originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    //if all the checks pass the data along to the next step
    if (originalCheckData &&
        originalCheckData.id &&
        originalCheckData.phone &&
        originalCheckData.protocol &&
        originalCheckData.method &&
        originalCheckData.url &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) {
        //Perform the check
        workers.performCheck(originalCheckData);
    } else {
        console.log(`ID: ${originalCheckData.id}: one of the checks is not properly formatted so skipping it`);
    }
};

//Perform the check, send the oroginal checkdata and the outcome to the next step in the process
workers.performCheck = (originalCheckData) => {
    // Prepare the initial check outcome
    var checkOutcome = {
        error: false,
        responseCode: false
    };

    //mark that the outcome has not been sent yet
    var outcomeSent = false;

    //parse the hostname and the path from the original check data
    var parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);

    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path;

    //construct the request
    var requestDetails = {
        protocol: originalCheckData.protocol + ':',
        hostname: hostName,
        method: originalCheckData.method.toUpperCase(),
        path: path,
        timeout: originalCheckData.timeoutSeconds * 1000
    };

    //Instantiate the request object using either the http or https module

    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;

    var req = _moduleToUse.request(requestDetails, (response) => {
        var status = response.statusCode;
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event
    req.on('error', (err) => {
        //update check outcome and pass the data along
        checkOutcome.error = {
            error: true,
            value: err
        };

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('timeout', (err) => {
        //update check outcome and pass the data along
        checkOutcome.error = {
            error: true,
            value: 'timeout'
        };

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    //end the request
    req.end();
};

//process the check outcome, update the check data, trigger an alert if needed
//special case for accomodating a check that has never been performed before
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    //Decide if the check is considered up or down
    var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    //Decide if an alert is wanted
    var alertWanted = originalCheckData.lastChecked && originalCheckData.state != state ? true : false;

    //Log the outcome of the check, 
    var timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWanted, timeOfCheck);


    //update the check data
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;
    newCheckData.checkOutcome = checkOutcome;

    _data.update('checks', newCheckData.id, newCheckData, (err) => {
        if (!err) {
            if (alertWanted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome has not changed, no alert needed');
            }
        } else {
            console.log('Error trying to updates to one of the checks');
        }
    });

};

workers.alertUserToStatusChange = (newCheckData) => {
    var msg = 'Alert: Your check for ' + `${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is ${newCheckData.state}`;
    helpers.sendTwilioSms(newCheckData.phone, msg, (err) => {
        if (!err) {
            console.log('User was alerted for status change in their check');
        } else {
            console.log('Could not send sms to the user regarding status check');
        }
    });
};

workers.log = (originalCheckData, checkOutcome, state, alertWanted, timeOfCheck) => {
    var logData = {
        check: originalCheckData,
        outcome: checkOutcome,
        state: state,
        alert: alertWanted,
        time: timeOfCheck
    };
    var logString = JSON.stringify(logData);

    //Determine the name of the log file
    var logFileName = originalCheckData.id;

    _logs.append(logFileName, logString, (err) => {
        if (!err) {
            console.log('Logging to file succeeded');
        } else {
            console.log('Error: Logging to file failed');
        }
    });

};

workers.rotateLogs = () => {
    //List the uncompressed files
    _logs.list(false, (err, logs) => {
        if (!err && logs && logs.length) {
            console.log('DEBUG', logs);
            logs.forEach(logFileName => {
                //compress the data to different file
                var logId = logFileName.replace('.log', '');
                var newFileId = logId + '-' + Date.now();

                _logs.compress(logId, newFileId, (err) => {
                    if (!err) {
                        //truncate the log - original log file
                        _logs.truncate(logId, (err) => {
                            if (!err) {
                                console.log('Success Compressing Log File');
                            } else {
                                console.log('Error: truncating log file');
                            }
                        });
                    } else {
                        console.log('Error: Compresing one of the log files');
                    }
                });
            });
        } else {
            console.log('Error: Could not find any logs to rotate');
        }
    });
};

//Timer to execute to log rotation perday
workers.logRotationLoop = () => {
    var interval = setInterval(() => {
        workers.rotateLogs();
    }, 1000 * 10);
};

//Init script
workers.init = () => {
    // Execute all the check
    workers.gatherAllChecks();

    //Call the loop so that checks keep executing on their own
    workers.loop();

    //Compress all the logs immeditely
    workers.rotateLogs();

    //Call the compression loop so logs will be rotated
    workers.logRotationLoop();
};


module.exports = workers;