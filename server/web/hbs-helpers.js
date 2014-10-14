/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf           = require('../utils/config');
var cdn             = require("./cdn");
var _               = require('underscore');
var appVersion      = require('./appVersion');
var safeJson        = require('../utils/safe-json');
var env             = process.env.NODE_ENV;
var minifiedDefault = nconf.get("web:minified");
var util            = require('util');

var cdns;
if(nconf.get("cdn:use")) {
  cdns = nconf.get("cdn:hosts");
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
  mixpanelToken: nconf.get("stats:mixpanel:enabled") && nconf.get("stats:mixpanel:token"),
  googleTrackingId: nconf.get("stats:ga:key"),
  googleTrackingDomain: nconf.get("stats:ga:domain"),
  goSquaredTrackingId: nconf.get("web:goSquaredId"),
  env: env,
  cdns: cdns,
  version: appVersion.getVersion(),
  assetTag: appVersion.getAssetTag(),
  logging: nconf.get("web:consoleLogging"),
  ravenUrl: nconf.get("errorReporting:clientRavenUrl"),
  websockets: {
    fayeUrl: nconf.get('ws:fayeUrl'),
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

  var cdnFunc;
  if(options.skipCdn) {
    cdnFunc = function(a) { return '/' + a; };
  } else if(options.root) {
    cdnFunc = function(a) { return options.root + a; };
  } else {
    cdnFunc = cdn;
  }

  var skipCore = options.skipCore;

  var async    = 'async' in options ? options.async : true;
  var cdnOptions = { appcache: options.appcache };

  var baseUrl = cdnFunc("js/", cdnOptions);
  var asyncScript = async ? "defer='defer' async='true' " : '';

  if(minifiedDefault) {
    /* Distribution-ready */

    if(this.minified !== false) {
      url = url + ".min";
    }

    if(skipCore) {
      /* No requirejs */
      return util.format("<script type='text/javascript'>window.require_config.baseUrl = '%s';</script>" +
              "<script %s src='%s' type='text/javascript'></script>",
              baseUrl,
              asyncScript,
              cdnFunc(util.format("js/%s.js", url), cdnOptions));
    }

    /* Standard distribution setup */
    return util.format("<script type='text/javascript'>window.require_config.baseUrl = '%s';</script>" +
            "<script %s data-main='%s' src='%s' type='text/javascript'></script>\n",
            baseUrl,
            asyncScript,
            url,
            cdnFunc("js/core-libraries.min.js", cdnOptions));

  }

  /* Non minified - use requirejs as the core (development mode) */
  return util.format("<script type='text/javascript'>window.require_config.baseUrl = '%s';</script>" +
         "<script %s data-main='%s.js' src='%s' type='text/javascript'></script>",
         baseUrl,
         asyncScript,
         url,
         cdnFunc("repo/requirejs/requirejs.js", cdnOptions));
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

// credit to @lazd (https://github.com/lazd) - https://github.com/wycats/handlebars.js/issues/249
exports.pluralize = function(number, singular, plural) {
  if (number === 1) return singular;
  return (typeof plural === 'string') ? plural : singular + 's';
};

exports.toLowerCase = function (str) {
  return str.toLowerCase();
};

exports.pad = function(options) {
  var content = "" + options.fn(this);
  var width = options.hash.width || 40;
  var directionRight = options.hash.direction ? options.hash.direction == "right" : true;

  while (content.length < width) {
    if (directionRight) {
      content+=" ";
    } else  {
      content=" " + content;
    }
  }
  return content;
};

exports.oneLine = function(options) {
  var content = "" + options.fn(this);
  content=content.replace(/\n/g,"");
  return content;
};


// FIXME REMOVE THIS ONCE THE NEW ERRORS PAGES ARE DONE
exports.typewriter = function (el, str) {
  return util.format('<script type="text/javascript">\n' +
    'var text = "%s";' +
    'var input = $("%s");' +
    'input.select();' +
    'setTimeout(startTyping, 1000, input, text);' +
    'function startTyping(input, text) {' +
      'for ( var i = 0; i < text.length; i++ ) {' +
        'setTimeout(addText,120*i, input, text.charAt(i));' +
      '}' +
    '}' +
    'function addText(i,c) {' +
      'if (c !== "-") i.val( i.val() + c );' +
    '}' +
  '</script>',
    str,
    el);
};

exports.formatNumber = function (n) {
  if (n < 1000) return n;
  if (n < 1000000) return (n / 1000).toFixed(1) + 'k';
  return (n / 100000).toFixed(1) + 'm';
};

/** FIXME we do not yet cover the ONE-TO-ONE case, also need to do better default values
 * githubTypeToClass() takes a GitHub type and provdides a css class
 *
 */
exports.githubTypeToClass = function (type) {
  if (/_CHANNEL/.test(type)) return 'icon-hash';
  else if (/REPO/.test(type)) return 'octicon-repo';
  else return 'default';
};

exports.getRoomName = function (name) {
  return name.split('/')[1];
};
