// Create and Export configuration variables

//Container for all the environments

var environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'hashingSecret': 'stagingSecret',
    'maxChecks': 5
};

//Production environment
environments.production = {
    'httpPort': 4000,
    'httpsPort': 4001,
    'envName': 'production',
    'hashingSecret': 'productionSecret',
    'maxChecks': 5
};

//Determine which environment to be exported out

var currentEnvironment = typeof (process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

//Check that the current environment is one of the environments above, if not default to staging
var environmentToExport = typeof (environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;