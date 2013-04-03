/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var cdn = require("./cdn");

// What version of requirejs should the client be loading?
var REQUIREJS_VERSION = "2.1.4";

var minified = nconf.get("web:minified");

exports.cdn = function(url, parameters) {
  return cdn(url, parameters ? parameters.hash:null);
};

exports.bootScript = function(url, parameters) {
  var requireScript,
      cdn = (parameters.hash.skipCdn) ? function(a) { return '/' + a; } : exports.cdn;

  var baseUrl = cdn("js/");

  //console.log("SkipCDN is currently set to ", parameters.hash.skipCdn);
  if(minified) {

    // note: when the skipCdn flag was introduced it affected this even though this isn't the file that was requested in this invocation
    requireScript = cdn("js/core-libraries.js");

    return "<script type='text/javascript'>\nwindow.require_config.baseUrl = '" + baseUrl + "';</script>\n" +
            "<script defer='defer' async='true' data-main='" + url + "' src='" + requireScript + "' type='text/javascript'></script>\n";

  }

  requireScript = cdn("js/libs/require/" + REQUIREJS_VERSION + "/require.js");

  return "<script type='text/javascript'>window.require_config.baseUrl = '" + baseUrl + "';</script>\n" +
         "<script defer='defer' async='true' data-main='" + url + ".js' src='" + requireScript + "' type='text/javascript'></script>";

};