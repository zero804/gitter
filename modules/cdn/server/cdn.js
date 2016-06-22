"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var appVersion = require('gitter-app-version');

var hosts, hostLength, cdnPrefix;

function passthrough(url, options) {
  if(!url) url = ""; // This should not be happening

  var nonrelative = options && options.nonrelative;
  var email = options && options.email;
  var prefix;
  if (email) {
    prefix = nconf.get('email:emailBasePath') + "/_s/l/";
  } else {
    prefix = nonrelative ? nconf.get('web:basepath') + "/_s/l/" : "/_s/l/";
  }
  return prefix + url;
}

function cdnSingle(url, options) {
  if(!url) url = ""; // This should not be happening

  var nonrelative = options && options.nonrelative;
  var email = options && options.email;

  if (email) {
    return nconf.get('email:emailBasePath') + "/_s/l/" + url;
  }

  var prefix = nonrelative ? "https://" : "//";
  if(options && options.notStatic === true) {
    return prefix + hosts[0] + "/" + url;
  }

  return prefix + hosts[0] + cdnPrefix + "/" + url;
}

function cdnMulti(url, options) {
  if(!url) url = ""; // This should not be happening

  var email = options && options.email;

  if (email) {
    return nconf.get('email:emailBasePath') + "/_s/l/" + url;
  }

  var x = 0;
  for(var i = 0; i < url.length; i = i + 3) {
    x = x + url.charCodeAt(i);
  }

  var host = hosts[x % hostLength];

  var nonrelative = options && options.nonrelative;
  var prefix = nonrelative ? "https://" : "//";

  if(options && options.notStatic === true) {
    return prefix + host + "/" + url;
  }

  return prefix + host + cdnPrefix + "/" + url;
}

var useCdn = nconf.get("cdn:use");

if(useCdn) {
  hosts = nconf.get("cdn:hosts");
  hostLength = hosts.length;

  cdnPrefix = nconf.get("cdn:prefix");
  if(cdnPrefix) {
    cdnPrefix = "/" + cdnPrefix;
  } else {
    var assetTag = appVersion.getAssetTag();
    cdnPrefix = assetTag ? "/_s/" + assetTag : '';
  }

  if(hostLength > 1) {
    module.exports = cdnMulti;
  } else {
    module.exports = cdnSingle;
  }
} else {
  module.exports = passthrough;
}
