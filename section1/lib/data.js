/*
 * Library for storing and editing data
 */

var fs = require('fs');
var path = require('path');
var helpers = require('./helpers');

// Container for this module (to be exported)
var lib = {};

//Define base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write Data to a file
lib.create = (dir, file, data, callback) => {
    //Try opening the file for writing

    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data into a string
            var stringData = JSON.stringify(data);
            // Write to the file
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing file');
                        }
                    });
                } else {
                    callback('Error writing to the file');
                }
            });
        } else {
            callback('Could not create new file, it may already exist');
        }
    })
};

// Read data from a file
lib.read = (dir, file, callback) => {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', (err, data) => {
        if (!err && data) {
            var parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, parsedData);
        }
    });
};

lib.update = (dir, file, data, callback) => {
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            var stringData = JSON.stringify(data);
            fs.truncate(fileDescriptor, (err) => {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing the file');
                                }
                            });

                        } else {
                            callback('Error writing to the file');
                        }
                    })
                } else {
                    callback('Error truncating file');
                }
            });
        } else {
            callback('Could not open the file, it may not exist');
        }
    });
};

lib.delete = (dir, file, callback) => {
    //Unlinking 
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', (err) => {
        if (!err) {
            callback(false);
        } else {
            callback('Erro deleting the file');
        }
    });
};


module.exports = lib;