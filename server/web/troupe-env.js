'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var appVersion = require('./appVersion');

var env = process.env.NODE_ENV;

var cdns;
if(nconf.get('cdn:use')) {
  cdns = nconf.get('cdn:hosts');
}

// This stuff never changes
var troupeEnv = {
  domain: nconf.get('web:domain'),
  baseServer: nconf.get('web:baseserver'),
  basePath: nconf.get('web:basepath'),
  apiBasePath: nconf.get('web:apiBasePath'),
  homeUrl: nconf.get('web:homeurl'),
  badgeBaseUrl: nconf.get('web:badgeBaseUrl'),
  embedBaseUrl: nconf.get('web:embedBaseUrl'),
  mixpanelToken: nconf.get('stats:mixpanel:enabled') && nconf.get('stats:mixpanel:token'),
  googleTrackingId: nconf.get('stats:ga:key'),
  googleTrackingDomain: nconf.get('stats:ga:domain'),
  goSquaredTrackingId: nconf.get('web:goSquaredId'),
  env: env,
  cdns: cdns,
  version: appVersion.getVersion(),
  assetTag: appVersion.getAssetTag(),
  logging: nconf.get('web:consoleLogging'),
  ravenUrl: nconf.get('errorReporting:clientRavenUrl'),
  websockets: {
    fayeUrl: nconf.get('ws:fayeUrl'),
    options: {
      timeout: nconf.get('ws:fayeTimeout'),
      retry: nconf.get('ws:fayeRetry')
    }
  },
  embed: {
    basepath: nconf.get('embed:basepath'),
    cacheBuster: nconf.get('embed:cacheBuster')
  },
  billingUrl: nconf.get('web:billingBaseUrl'),
  maxFreeOrgRoomMembers: nconf.get('maxFreeOrgRoomMembers')
};


module.exports = troupeEnv;
