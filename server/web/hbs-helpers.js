/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var nconf = require('../utils/config');
var fs = require("fs");

// What version of requirejs should the client be loading?
var REQUIREJS_VERSION = "2.1.4";

// Look through the CDNS
var cdnId = -1;

function passthrough(url) {
  return "/" + url;
}


function cdnSingle(url) {
  return "//" + hosts[0] +cdnPrefix + "/" + url;
}

function cdnMulti(url) {
  var d = (cdnId + 1) % hostLength;
  cdnId = d;

  return "//" + hosts[d] +cdnPrefix + "/" + url;
}

var useCdn = nconf.get("cdn:use");

if(!useCdn) {
  exports.cdn = passthrough;
} else {
  var hosts = nconf.get("cdn:hosts");
  var hostLength = hosts.length;

  var cdnPrefix = nconf.get("cdn:prefix");
  if(cdnPrefix) {
    cdnPrefix = "/" + cdnPrefix;
  } else {
    var cdnPrefixFile = nconf.get("cdn:prefixFile");
    if(cdnPrefixFile) {
        cdnPrefix = "/s/" + ("" + fs.readFileSync(cdnPrefixFile)).trim();
    } else {
      cdnPrefix = "";
    }
  }

  if(hostLength > 1) {
    exports.cdn = cdnSingle;
  } else {
    exports.cdn = cdnMulti;
  }
}

var minified = nconf.get("web:minified");

exports.bootScript = function(url, useCdn) {
  var requireScript, scriptLocation, cdn = (useCdn) ? exports.cdn : function(a) { return a; };

  if(minified) {

    requireScript = cdn("js/core-libraries.js");
    var baseUrl = cdn("js/");

    return  "<script type='text/javascript'>\nwindow.require_config.baseUrl = '" + baseUrl + "';</script>\n" +
            "<script defer='defer' async='true' data-main='" + url + "' src='" + requireScript + "' type='text/javascript'></script>\n";

  }

  scriptLocation = cdn("js/" + url);

  requireScript = cdn("js/libs/require/" + REQUIREJS_VERSION + "/require.js");
  return "<script defer='defer' async='true' data-main='" + scriptLocation + ".js' src='" + requireScript + "' type='text/javascript'></script>";

};