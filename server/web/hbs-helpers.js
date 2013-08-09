/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var cdn = require("./cdn");
var _ = require('underscore');

var minifiedDefault = nconf.get("web:minified");
var appTag = require('./appVersion').getAppTag();

// This stuff never changes
var troupeEnv = {
  baseServer: nconf.get('web:baseserver'),
  basePath: nconf.get('web:basepath'),
  homeUrl: nconf.get('web:homeurl'),
  mixpanelToken: nconf.get("stats:mixpanel:token"),
  googleTrackingId: nconf.get("web:trackingId"),
  appVersion: appTag,
  websockets: {
    fayeUrl: nconf.get('ws:fayeUrl') || "/faye",
    options: {
      timeout: nconf.get('ws:fayeTimeout'),
      retry: nconf.get('ws:fayeRetry'),
      interval: nconf.get('ws:fayeInterval')
    }
  },
};

exports.cdn = function(url, parameters) {
  return cdn(url, parameters ? parameters.hash:null);
};

exports.bootScript = function(url, parameters) {
  var options = parameters.hash;

  var requireScript;
  var cdn      = (options.skipCdn) ? function(a) { return '/' + a; } : exports.cdn;
  var skipCore = options.skipCore;
  var minified = 'minified' in options ? options.minified : minifiedDefault;
  var async    = 'async' in options ? options.async : true;

  var baseUrl = cdn("js/");
  var asyncScript = async ? "defer='defer' async='true' " : '';

  if(minified) {
    if(skipCore) {
      requireScript = cdn("js/" + url + ".min.js");
    } else {
      url = url + ".min";
      // note: when the skipCdn flag was introduced it affected this even though this isn't the file that was requested in this invocation
      requireScript = cdn("js/core-libraries.min.js");
    }

    return "<script type='text/javascript'>\nwindow.require_config.baseUrl = '" + baseUrl + "';</script>\n" +
            "<script " + asyncScript + "data-main='" + url + "' src='" + requireScript + "' type='text/javascript'></script>\n";

  }

  requireScript = cdn("repo/requirejs/requirejs.js");

  return "<script type='text/javascript'>window.require_config.baseUrl = '" + baseUrl + "';</script>\n" +
         "<script " + asyncScript + "data-main='" + url + ".js' src='" + requireScript + "' type='text/javascript'></script>";

};

exports.isMobile = function(agent, options) {
  return ((agent.match(/ipad/i)) ? options.fn(this) : null);
};

exports.generateEnv = function(parameters) {
  var options = parameters.hash;

  var env = options ? _.extend({}, troupeEnv, options) : troupeEnv;

  return '<script type="text/javascript">' +
          'window.troupeEnv = ' + JSON.stringify(env) + ';' +
          '</script>';
};

exports.generateTroupeContext = function(troupeContext, parameters) {
  var options = parameters.hash;

  var env = options ? _.extend({}, troupeEnv, options) : troupeEnv;

  return '<script type="text/javascript">' +
          'window.troupeEnv = ' + JSON.stringify(env) + ';' +
          'window.troupeContext = ' + JSON.stringify(troupeContext) + ';' +
          '</script>';
};