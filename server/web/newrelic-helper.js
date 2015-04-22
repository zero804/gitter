'use strict';

var env = require('../utils/env');
var template = require('./compile-web-template')('/js/views/tmpl/newrelic');

module.exports = function () {
  return (env.config.get('newrelic:enabled')) ? template() : '';
};
