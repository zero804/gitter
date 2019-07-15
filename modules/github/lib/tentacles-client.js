'use strict';

var Tentacles = require('tentacles');
var request = require('./request-wrapper');
var badCredentialsCheck = require('./bad-credentials-check');

const extensions = [];
if (process.env.DISABLE_GITHUB_API) {
  extensions.push(function(options, callback /*, next*/) {
    // Bypass the underlying call and return immediately with a static mocked response
    return callback(
      null,
      { statusCode: 200, headers: { 'content-type': 'application/json' } },
      '[]'
    );
  });
}

var tentacles = new Tentacles({
  request: request,
  errorHandler: badCredentialsCheck,
  extensions
});

module.exports = tentacles;
