/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Tentacles = require('tentacles');
var request = require('./request-wrapper');
var badCredentialsCheck = require('./bad-credentials-check');

var tentacles = new Tentacles({
  request: request,
  headers: {
    Accept: 'application/vnd.github.moondragon+json'
  },
  errorHandler: badCredentialsCheck
});


module.exports = tentacles;
