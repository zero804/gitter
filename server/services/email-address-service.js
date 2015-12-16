'use strict';

var BackendMuxer = require('./backend-muxer');

module.exports = function(user, preferStoredEmail) {
  var backendMuxer = new BackendMuxer(user);
  return backendMuxer.getEmailAddress(preferStoredEmail);
};
