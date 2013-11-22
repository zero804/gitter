/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

// This is actually the cdn prefix, but we're using it as the app version,
// which only shows whether the version is different, not any ordering of versions.
var fs = require("fs");
var winston = require('winston');

var commit;
try {
	commit = ('' + fs.readFileSync(__dirname + '/../../GIT_COMMIT')).trim();
} catch(e) {
	winston.error('Unable to read GIT_COMMIT: ' + e);
}

var appTag = commit ? commit.substring(0, 6) : 'dev' + Math.floor(Date.now() / 10000);
var cdnPrefix = commit ? "/_s/" + appTag : '';


function getCurrentVersion() {
  return cdnPrefix;
}

function getAppTag() {
	return appTag;
}

exports.getCurrentVersion = getCurrentVersion;
exports.getAppTag = getAppTag;