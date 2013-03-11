/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var appVersion = require('./appVersion');

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
  var x = 0;
  for(var i = 0; i < url.length; i = i + 3) {
    x = x + url.charCodeAt(i);
  }

  var host = hosts[x % hostLength];

  var nonrelative = options && options.nonrelative;
  var prefix = nonrelative ? "http://" : "//";

  if(options && options.notStatic === true) {
    return prefix + host + "/" + url;
  }

  return prefix + host + cdnPrefix + "/" + url;
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
    module.exports = cdnMulti;
  } else {
    module.exports = cdnSingle;
  }
}
