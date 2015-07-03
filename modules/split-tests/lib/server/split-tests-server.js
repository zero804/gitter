/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env             = require('gitter-web-env');
var nconf           = env.config;
var debug           = require('debug')('gitter:split-tests');

var ONE_WEEK = 7 * 86400000;

function getGroup() {
  return (((Math.floor(Math.random() * 2) + 1) % 2)) === 0 ? 'control' : 'treatment';
}

function configure(req, res, testName, disableSet) {
  var cookieName = 'variant_' + testName;
  var value = req.cookies[cookieName];

  // Allow the value to be overriden
  var forcedParam = req.query['_set_variant_' + testName];
  if (forcedParam && forcedParam !== 'control' && forcedParam !== 'treatment') {
    forcedParam = null;
  }

  // TODO: remove this anytime after 1 Sep 2015
  if (req.cookies.variant) {
    res.clearCookie('variant');
  }

  if (!value || forcedParam) {
    if (disableSet) return;

    value = forcedParam || getGroup();

    debug('Setting split test cookie %s to %s', value);
    res.cookie(cookieName, value, {
      domain: nconf.get("web:cookieDomain"),
      httpOnly: false,
      secure: nconf.get("web:secureCookies"),
      maxAge: ONE_WEEK
    });
  }

  if (!req.variants) req.variants = {};
  req.variants[testName] = value;

  return value;
}

function middleware(testName, disableSet) {
  return function(req, res, next) {
    configure(req, res, testName, disableSet);
    next();
  };
}

function selectTemplate(variant, defaultTemplate, variants) {
  var template = variants[variant] || defaultTemplate;
  debug('Selected template %s for variant %s', template, variant);
  return template;
}


module.exports = {
  configure: configure,
  middleware: middleware,
  selectTemplate: selectTemplate
};
