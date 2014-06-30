/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

// This is actually the cdn prefix, but we're using it as the app version,
// which only shows whether the version is different, not any ordering of versions.
var fs = require("fs");
var winston = require('../utils/winston');

var revision, assetTag;
var tagFile = __dirname + '/../../ASSET_TAG';

try {
  if(fs.existsSync(tagFile)) {
    assetTag = ('' + fs.readFileSync(tagFile)).trim();
    revision = assetTag;
  }
} catch(e) {
	winston.error('Unable to read ASSET_TAG: ' + e);
}

if(!assetTag) {
  assetTag = 'dev' + Math.floor(Date.now() / 10000);
  revision = 'develop';
}

var cdnPrefix = assetTag ? "/_s/" + assetTag : '';

function getCurrentVersion() {
  return cdnPrefix;
}

function getAppTag() {
	return assetTag;
}

function getRevision() {
  return revision;
}

exports.getCurrentVersion = getCurrentVersion;
exports.getAppTag = getAppTag;
exports.getRevision = getRevision;
