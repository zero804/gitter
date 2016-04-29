'use strict';

var Tentacles = require('tentacles');
var request = require('./request-wrapper');
var badCredentialsCheck = require('./bad-credentials-check');

var tentacles = new Tentacles({
  request: request,
  errorHandler: badCredentialsCheck
});


module.exports = tentacles;
