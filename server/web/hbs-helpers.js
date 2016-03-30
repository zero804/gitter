"use strict";

var _         = require('underscore');
var safeJson  = require('../utils/safe-json');
var util      = require('util');
var troupeEnv = require('./troupe-env');
var cdn = require('./cdn');

exports.cdn = function(url, parameters) {
  return cdn(url, parameters ? parameters.hash:null);
};

function cdnUrlGenerator(url, options) {
  if(options.root) {
    return options.root + url;
  }

  return cdn(url, {});
}

exports.bootScript = function(url, parameters) {
  var options = parameters.hash;
  var jsRoot = options && options.jsRoot || "js";

  var baseUrl = cdnUrlGenerator(jsRoot + '/', options);
  var vendorScriptUrl = cdnUrlGenerator(jsRoot + "/vendor.js", options);
  var bootScriptUrl = cdnUrlGenerator(jsRoot + "/" + url + ".js", options);

  return util.format(
         "<script type='text/javascript'>window.webpackPublicPath = '%s';</script>" +
         "<script type='text/javascript' src='%s'></script>" +
         "<script type='text/javascript' src='%s'></script>",
         baseUrl,
         vendorScriptUrl,
         bootScriptUrl);
};

exports.isMobile = function(agent, options) {
  if (!agent) return false;
  return ((agent.match(/ipad/i)) ? options.fn(this) : null);
};

function createEnv(context, options) {
  if(options) {
    return _.extend({
      lang: context.lang
    }, troupeEnv, options);
  }
  return troupeEnv;
}
exports.generateEnv = function(parameters) {
  var options = parameters.hash;
  var env = createEnv(this, options);

  return '<script type="text/javascript">' +
          'window.troupeEnv = ' + safeJson(JSON.stringify(env)) + ';' +
          '</script>';
};

exports.generateTroupeContext = function(troupeContext, parameters) {
  var options = parameters.hash;

  var env = createEnv(this, options);

  return '<script type="text/javascript">' +
          'window.troupeEnv = ' + safeJson(JSON.stringify(env)) + ';' +
          'window.troupeContext = ' + safeJson(JSON.stringify(troupeContext)) + ';' +
          '</script>';
};

exports.pluralize = require('../../shared/handlebars/helpers/pluralize');
exports.when = require('../../shared/handlebars/helpers/when');

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
  else if (/ORG/.test(type)) return 'octicon-organization';
  else return 'default';
};

exports.getRoomName = function (name) {
  return name.split('/')[1] || 'general';
};
