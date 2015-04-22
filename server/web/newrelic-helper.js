'use strict';

var env = require('../utils/env');
var template = require('./compile-web-template')('/js/views/tmpl/newrelic');

module.exports = function () {
  if (env.config.get('newrelic:enabled')) {
    var key = env.config.get('newrelic:browserkey');
    var id  = env.config.get('newrelic:browserid');
    return template({key: key, id: id});
  }
};
