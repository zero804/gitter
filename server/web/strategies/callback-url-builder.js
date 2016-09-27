'use strict';

var env = require('gitter-web-env');
var config = env.config;

var stagingBranchName = process.env.GIT_TAG;
var oauthRedirectorBasePath = config.get('web:oauthRedirectorBasepath');
var webPathBase = config.get('web:basepath');

function stagingCallbackUrlBuilder(service) {
  //  http://nginx-router.service.beta.gitter/callback/github/2196-who-watches-the-watchers
  if (service) {
    return oauthRedirectorBasePath + '/callback/' + service + '/' + stagingBranchName;
  } else {
    return oauthRedirectorBasePath + '/callback/' + stagingBranchName;
  }
}

function standardCallbackUrlBuilder(service) {
  if (service) {
    return webPathBase + '/login/' + service + '/callback';
  } else {
    return webPathBase + '/login/callback';
  }
}

var callbackUrlBuilder;
if (oauthRedirectorBasePath && stagingBranchName) {
  callbackUrlBuilder = stagingCallbackUrlBuilder;
} else {
  callbackUrlBuilder = standardCallbackUrlBuilder;
}

module.exports = callbackUrlBuilder;
