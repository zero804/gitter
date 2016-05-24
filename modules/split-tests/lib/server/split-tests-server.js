"use strict";

var env             = require('gitter-web-env');
var nconf           = env.config;
var debug           = require('debug')('gitter:infra:split-tests');

var ONE_WEEK = 7 * 86400000;

function getGroup() {
  return (((Math.floor(Math.random() * 2) + 1) % 2)) === 0 ? 'control' : 'treatment';
}

function getVariantFromRequest(req, testName) {
  var queryValue = req.query['_set_variant_' + testName];
  if (queryValue == 'control' || queryValue == 'treatment') {
    return queryValue;
  }
}

function configure(req, res, testName, disableSet) {
  var cookieName = 'variant_' + testName;

  // Allow the value to be overriden
  var forcedParam = getVariantFromRequest(req, testName);

  // If cookies are not enabled in the current environment use the set value
  // defaulting to control.
  // CORS with Cookies is more trouble that it's worth
  if (!req.cookies) return forcedParam || 'control';

  // From here on, the cookies middleware has been installed
  var value = req.cookies[cookieName];

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

function selectTemplate(variant, controlTemplate, variantTemplate) {
  var template = variant === 'treatment' ? variantTemplate : controlTemplate;
  debug('Selected template %s for variant %s', template, variant);
  return template;
}


module.exports = {
  configure: configure,
  middleware: middleware,
  selectTemplate: selectTemplate
};
