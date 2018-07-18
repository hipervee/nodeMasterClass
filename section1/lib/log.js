var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var lib = {};

//Define base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.logs/');

//Append a string to a file, create a file if it does not exist
lib.append = (fileName, str, callback) => {
    fs.open(lib.baseDir + fileName + '.log', 'a', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            fs.appendFile(fileDescriptor, str + '\n', (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing the file that is being appended');
                        }
                    });
                } else {
                    callback('could not apped to file');
                }
            });
        } else {
            callback('could not open file for writing')
        }
    });
};

lib.list = (includeCompressedLogFiles, callback) => {
    fs.readdir(lib.baseDir, (err, data) => {
        if (!err && data && data.length) {
            var trimmedFileNames = [];
            data.forEach(fileName => {
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }

                //Add on gz files to this array
                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogFiles) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });
            callback(false, trimmedFileNames);
        } else {
            callback('Error: No files to list');
        }
    });
};

//Compress the contents of one log file into .gz.b64 within the same directory
lib.compress = (logId, newFileId, callback) => {
    var sourceFile = logId + '.log';
    var destinationFile = newFileId + '.gz.b64';

    fs.readFile(lib.baseDir + sourceFile, 'utf8', (err, inputString) => {
        if (!err && inputString) {
            //compress the data using gzip
            zlib.gzip(inputString, (err, buffer) => {
                if (!err && buffer) {
                    //send the compressed data to dest file
                    fs.open(lib.baseDir + destinationFile, 'wx', (err, fileDescriptor) => {
                        if (!err && fileDescriptor) {
                            //write to destination file
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                                if (!err) {
                                    fs.close(fileDescriptor, (err) => {
                                        if (!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    console.log(err);
                }
            });
        } else {
            console.log(err);
        }
    });
};

//Decompress the contents of a gz.b64 file into a stirng var
lib.decompress = (fileId, callback) => {
    var fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir + fileName, 'utf8', (err, str) => {
        if (!err && str) {
            //Decompress the data
            var inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, (err, outputBuffer) => {
                if (!err && outputBuffer) {
                    var str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

// Truncate the log file

lib.truncate = (fileId, callback) => {
    fs.truncate(lib.baseDir + fileId + '.log', 0, (err) => {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    });
};

module.exports = lib;