/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var GitterCat = require('gittercat');
var request = require('./request-wrapper');
var badCredentialsCheck = require('./bad-credentials-check');

var gittercat = new GitterCat({
  request: request,
  headers: {
    Accept: 'application/vnd.github.moondragon+json'
  },
  errorHandler: badCredentialsCheck
});


module.exports = gittercat;
