"use strict";

/* #### See version-files in the Makefile #### */
var fs = require('fs');
var path = require('path');
var winston = require('gitter-web-env').logger;

function readFileSync(fileName) {
  var file = path.join(__dirname, '../..', fileName);
  try {
    if(fs.existsSync(file)) {
      return ('' + fs.readFileSync(file)).trim();
    }
  } catch(e) {
    winston.error('Unable to read ' + file + ': ' + e);
  }
  return '';
}

var assetTag = readFileSync('ASSET_TAG') || 'l';
var commit = readFileSync('GIT_COMMIT') || '';
var branch = readFileSync('VERSION') || 'HEAD';
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
