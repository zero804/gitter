'use strict';

var BackendMuxer = require('./backend-muxer');
var Q = require('bluebird-q');

var env = require('gitter-web-env');
var config = env.config;

var TEST_EMAIL = config.get('email:toAddress');

module.exports = function(user, options) {
  if (!user) return Q.reject(new Error('User required'));

  // test email address, should be set in `config.user-overrides.json`
  if (TEST_EMAIL) return Q.resolve(TEST_EMAIL);

  if (!options) options = {};

  if (options.preferInvitedEmail && user.invitedEmail) return Q.resolve(user.invitedEmail);

  var backendMuxer = new BackendMuxer(user);
  return backendMuxer.getEmailAddress(options);
};
