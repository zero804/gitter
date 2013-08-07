/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

// This is actually the cdn prefix, but we're using it as the app version,
// which only shows whether the version is different, not any ordering of versions.
var nconf = require('../utils/config');
var fs = require("fs");

var cdnPrefix, cdnPrefixFile = nconf.get("cdn:prefixFile");

if(cdnPrefixFile) {
  cdnPrefix = "/s/" + ("" + fs.readFileSync(cdnPrefixFile)).substring(0,6).trim();
} else {
  cdnPrefix = "";
}

function getCurrentVersion() {
  return cdnPrefix;
}

exports.getCurrentVersion = getCurrentVersion;