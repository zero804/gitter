/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

/* #### See version-files in the Makefile #### */

var fs = require("fs");
var winston = require('../utils/winston');

function readFileSync(fileName) {
  try {
    if(fs.existsSync(__dirname + '/../../' + fileName)) {
      return ('' + fs.readFileSync(fileName)).trim();
    }
  } catch(e) {
    winston.error('Unable to read ' + fileName + ': ' + e);
  }
  return '';
}

var assetTag = readFileSync('ASSET_TAG') || '';
var commit = readFileSync('GIT_COMMIT') || '';
var branch = readFileSync('GIT_BRANCH') || 'HEAD';
var version = commit ? commit.substring(0, 6) : 'HEAD-' + Math.floor(Date.now() / 10000);

/* THE NEW */
/* Returns a unique identifier for the current code */
exports.getVersion = function() {
  return version;
};

/* Returns the current asset hash or '' */
exports.getAssetTag = function() {
  return assetTag;
};

/* Returns the current commit hash */
exports.getCommit = function() {
  return commit;
};

/* Returns the current branch or HEAD */
exports.getBranch = function() {
  return branch;
};

exports.getGithubLink = function() {
  if(commit)
    return 'https://github.com/troupe/gitter-webapp/commit/' + commit;

  return '';
};