/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

// This is actually the cdn prefix, but we're using it as the app version,
// which only shows whether the version is different, not any ordering of versions.
var nconf = require('../utils/config');
var fs = require("fs");
var winston = require('winston');

var cdnPrefix, cdnPrefixFile = nconf.get("cdn:prefixFile");

if(cdnPrefixFile) {
  try {
    cdnPrefix = "/s/" + ("" + fs.readFileSync(cdnPrefixFile)).substring(0,6).trim();
  } catch(e) {
    winston.error('Unable to load cdnPrefixFile' + cdnPrefixFile + ': ' + e, { exception: e });
    cdnPrefix = "";
  }
} else {
  cdnPrefix = "";
}

function getCurrentVersion() {
  return cdnPrefix;
}

exports.getCurrentVersion = getCurrentVersion;