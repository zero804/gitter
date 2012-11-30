/*jslint node: true */
"use strict";

var nconf = require('../utils/config');
var fs = require("fs");

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
        cdnPrefix = "/" + ("" + fs.readFileSync(cdnPrefixFile)).trim();
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


exports.bootScript = function(url) {
  var scriptLocation = exports.cdn(url);
  var requireScript = exports.cdn("js/libs/require/2.0.4/require-jquery.js");

  return "<script data-main='" + scriptLocation + "' src='" + requireScript + "' type='text/javascript'></script>";
};