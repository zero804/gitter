/*eslint-env node */

'use strict';

var config = require('gitter-web-env').config;
var appVersion = require('gitter-app-version');

var env = process.env.NODE_ENV;

var cdns;
if(config.get('cdn:use')) {
  cdns = config.get('cdn:hosts');
}

// This stuff never changes
var troupeEnv = {
  domain: config.get('web:domain'),
  baseServer: config.get('web:baseserver'),
  basePath: config.get('web:basepath'),
  apiBasePath: config.get('web:apiBasePath'),
  homeUrl: config.get('web:homeurl'),
  badgeBaseUrl: config.get('web:badgeBaseUrl'),
  embedBaseUrl: config.get('web:embedBaseUrl'),
  mixpanelToken: config.get('stats:mixpanel:enabled') && config.get('stats:mixpanel:token'),
  googleTrackingId: config.get('stats:ga:key'),
  googleTrackingDomain: config.get('stats:ga:domain'),
  goSquaredTrackingId: config.get('web:goSquaredId'),
  env: env,
  cdns: cdns,
  version: appVersion.getVersion(),
  assetTag: appVersion.getAssetTag(),
  logging: config.get('web:consoleLogging'),
  ravenUrl: config.get('errorReporting:clientRavenUrl'),
  websockets: {
    fayeUrl: config.get('ws:fayeUrl'),
    options: {
      timeout: config.get('ws:fayeTimeout'),
      retry: config.get('ws:fayeRetry')
    }
  },
  embed: {
    basepath: config.get('embed:basepath'),
    cacheBuster: config.get('embed:cacheBuster')
  },
  billingUrl: config.get('web:billingBaseUrl'),
  maxFreeOrgRoomMembers: config.get('maxFreeOrgRoomMembers')
};


module.exports = troupeEnv;
