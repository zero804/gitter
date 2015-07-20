/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Tentacles = require('tentacles');
var request = require('./request-wrapper');
var badCredentialsCheck = require('./bad-credentials-check');
var githubMediaTypes = require('./github-media-types');

var tentacles = new Tentacles({
  request: request,
  headers: {
    Accept: githubMediaTypes.QUICKSILVER
  },
  errorHandler: badCredentialsCheck
});


module.exports = tentacles;
