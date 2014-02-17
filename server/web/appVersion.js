/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

// This is actually the cdn prefix, but we're using it as the app version,
// which only shows whether the version is different, not any ordering of versions.
var fs = require("fs");
var winston = require('winston');

var commit, revision;
var tagFile = __dirname + '/../../GIT_COMMIT';

try {
  if(fs.existsSync(tagFile)) {
    commit = ('' + fs.readFileSync(tagFile)).trim();
    revision = commit;
  }
} catch(e) {
	winston.error('Unable to read GIT_COMMIT: ' + e);
}

if(!commit) {
  commit = 'dev' + Math.floor(Date.now() / 10000);
  revision = 'develop';
}

var appTag = commit.substring(0, 6);
var cdnPrefix = commit ? "/_s/" + appTag : '';

function getCurrentVersion() {
  return cdnPrefix;
}

function getAppTag() {
	return appTag;
}

function getRevision() {
  return revision;
}

exports.getCurrentVersion = getCurrentVersion;
exports.getAppTag = getAppTag;
exports.getRevision = getRevision;