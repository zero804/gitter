/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var appVersion = require('./appVersion');

var cdnId = -1;
var hosts, hostLength, cdnPrefix;

function passthrough(url, options) {
  var nonrelative = options && options.nonrelative;
  var prefix = nonrelative ? nconf.get('web:basepath') + "/" : "/";
  return prefix + url;
}

function cdnSingle(url, options) {
  var nonrelative = options && options.nonrelative;
  var prefix = nonrelative ? "http://" : "//";
  if(options && options.notStatic === true) {
    return prefix + hosts[0] + "/" + url;
  }

  return prefix + hosts[0] + cdnPrefix + "/" + url;
}

function cdnMulti(url, options) {
  var d = (cdnId + 1) % hostLength;
  cdnId = d;

  var nonrelative = options && options.nonrelative;
  var prefix = nonrelative ? "http://" : "//";

  if(options && options.notStatic === true) {
    return prefix + hosts[d] + "/" + url;
  }

  return prefix + hosts[d] +cdnPrefix + "/" + url;
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
    cdnPrefix = appVersion.getCurrentVersion();
  }

  if(hostLength > 1) {
    module.exports = cdnSingle;
  } else {
    module.exports = cdnMulti;
  }
}
