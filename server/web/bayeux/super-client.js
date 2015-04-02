'use strict';

var env   = require('../../utils/env');
var nconf = env.config;

var superClientPassword = nconf.get('ws:superClientPassword');

module.exports = {
  outgoing: function(message, callback) {
    message.ext = message.ext || {};
    message.ext.password = superClientPassword;
    callback(message);
  }
};
