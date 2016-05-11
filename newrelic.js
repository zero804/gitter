/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
'use strict';

var env = require('gitter-web-env');
var key = env.config.get('newrelic:key');

exports.config = {
  app_name: ['Gitter'],
  license_key: key,
  logging: {
    level: 'fatal'
  }
};
