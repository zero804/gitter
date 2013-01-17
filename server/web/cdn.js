/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var nconf = require('../utils/config');
var fs = require("fs");

var cdnId = -1;
var hosts, hostLength, cdnPrefix;

function passthrough(url, options) {
  return "/" + url;
}

function cdnSingle(url, options) {
  if(options && options.notStatic === true) {
    return "//" + hosts[0] + "/" + url;
  }

  return "//" + hosts[0] + cdnPrefix + "/" + url;
}

function cdnMulti(url, options) {
  var d = (cdnId + 1) % hostLength;
  cdnId = d;

  if(options && options.notStatic === true) {
    return "//" + hosts[d] + "/" + url;
  }

  return "//" + hosts[d] +cdnPrefix + "/" + url;
}

var useCdn = nconf.get("cdn:use");

if(!useCdn) {
  module.exports = passthrough;
} else {
  hosts = nconf.get("cdn:hosts");
  hostLength = hosts.length;

  cdnPrefix = nconf.get("cdn:prefix");
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
    module.exports = cdnSingle;
  } else {
    module.exports = cdnMulti;
  }
}
