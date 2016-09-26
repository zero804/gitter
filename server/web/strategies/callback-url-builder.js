'use strict';

var env = require('gitter-web-env');
var config = env.config;

var stagingBranchName = process.env.GITTER_WEB_STAGING_BRANCH_NAME;
var oauthRedirectorBasePath = config.get('web:oauthRedirectorBasepath');
var webPathBase = config.get('web:basepath');

function stagingCallbackUrlBuilder(service) {
  //  http://nginx-router.service.beta.gitter/callback/github/2196-who-watches-the-watchers
  if (service) {
    return oauthRedirectorBasePath + '/callback/' + stagingBranchName;
  } else {
    return oauthRedirectorBasePath + '/callback/' + service + '/' + stagingBranchName;
  }
}

function standardCallbackUrlBuilder(service) {
  if (service) {
    return webPathBase + '/login/callback';
  } else {
    return webPathBase + '/login/' + service + '/callback';
  }
}

var callbackUrlBuilder;
if (oauthRedirectorBasePath && stagingBranchName) {
  callbackUrlBuilder = stagingCallbackUrlBuilder;
} else {
  callbackUrlBuilder = standardCallbackUrlBuilder;
}

module.exports = callbackUrlBuilder;
