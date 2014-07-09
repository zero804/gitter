/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf           = require('../utils/config');
var cdn             = require("./cdn");
var _               = require('underscore');
var appVersion      = require('./appVersion');
var safeJson        = require('../utils/safe-json');
var env             = process.env['NODE_ENV'];
var minifiedDefault = nconf.get("web:minified");

var cdns;
if(nconf.get("cdn:use")) {
  cdns = nconf.get("cdn:hosts");
}

// This stuff never changes
var troupeEnv = {
  domain: nconf.get('web:domain'),
  baseServer: nconf.get('web:baseserver'),
  basePath: nconf.get('web:basepath'),
  homeUrl: nconf.get('web:homeurl'),
  badgeBaseUrl: nconf.get('web:badgeBaseUrl'),
  embedBaseUrl: nconf.get('web:embedBaseUrl'),
  mixpanelToken: nconf.get("stats:mixpanel:token"),
  googleTrackingId: nconf.get("web:trackingId"),
  goSquaredTrackingId: nconf.get("web:goSquaredId"),
  env: env,
  cdns: cdns,
  version: appVersion.getVersion(),
  assetTag: appVersion.getAssetTag(),
  logging: nconf.get("web:consoleLogging"),
  ravenUrl: nconf.get("errorReporting:clientRavenUrl"),
  websockets: {
    fayeUrl: nconf.get('ws:fayeUrl') || "/faye",
    options: {
      timeout: nconf.get('ws:fayeTimeout'),
      retry: nconf.get('ws:fayeRetry'),
      interval: nconf.get('ws:fayeInterval')
    }
  },
  embed: {
    basepath: nconf.get('embed:basepath'),
    cacheBuster: nconf.get('embed:cacheBuster')
  },
  billingUrl: nconf.get('web:billingBaseUrl')
};

exports.cdn = function(url, parameters) {
  return cdn(url, parameters ? parameters.hash:null);
};

exports.bootScript = function(url, parameters) {
  var options = parameters.hash;

  var requireScript;
  var cdnFunc  = (options.skipCdn) ? function(a) { return '/' + a; } : cdn;
  var skipCore = options.skipCore;
  // Only allow minified true or false values, otherwise we'll use the default
  var minified = minified === true ? true : minified === false ? false : minifiedDefault;
  var async    = 'async' in options ? options.async : true;
  var cdnOptions = { appcache: options.appcache };

  var baseUrl = cdnFunc("js/", cdnOptions);
  var asyncScript = async ? "defer='defer' async='true' " : '';

  if(minified) {
    if(skipCore) {
      requireScript = cdnFunc("js/" + url + ".min.js", cdnOptions);
    } else {
      url = url + ".min";
      // note: when the skipCdn flag was introduced it affected this even though this isn't the file that was requested in this invocation
      requireScript = cdnFunc("js/core-libraries.min.js", cdnOptions);
    }

    return "<script type='text/javascript'>\nwindow.require_config.baseUrl = '" + baseUrl + "';</script>\n" +
            "<script " + asyncScript + "data-main='" + url + "' src='" + requireScript + "' type='text/javascript'></script>\n";

  }

  requireScript = cdnFunc("repo/requirejs/requirejs.js", cdnOptions);

  return "<script type='text/javascript'>window.require_config.baseUrl = '" + baseUrl + "';</script>\n" +
         "<script " + asyncScript + "data-main='" + url + ".js' src='" + requireScript + "' type='text/javascript'></script>";

};

exports.isMobile = function(agent, options) {
  if (!agent) return false;
  return ((agent.match(/ipad/i)) ? options.fn(this) : null);
};

exports.generateEnv = function(parameters) {
  var options = parameters.hash;
  var env = options ? _.extend({
    lang: this.lang
  }, troupeEnv, options) : troupeEnv;
  return '<script type="text/javascript">' +
          'window.troupeEnv = ' + safeJson(JSON.stringify(env)) + ';' +
          '</script>';
};

exports.generateTroupeContext = function(troupeContext, parameters) {
  var options = parameters.hash;

  var env = options ? _.extend({
    lang: this.lang
  }, troupeEnv, options) : troupeEnv;

  /* Disable the use of CDNs if we're using the appcache as douchey appcache doesn't support CDN fetchs */
  if(options && options.appcache) {
    env.cdns = [];
  }

  return '<script type="text/javascript">' +
          'window.troupeEnv = ' + safeJson(JSON.stringify(env)) + ';' +
          'window.troupeContext = ' + safeJson(JSON.stringify(troupeContext)) + ';' +
          '</script>';
};
