// This is actually the cdn prefix, but we're using it as the app version,
// which only shows whether the version is different, not any ordering of versions.
var nconf = require('../utils/config');
var fs = require("fs");

var cdnPrefix, cdnPrefixFile = nconf.get("cdn:prefixFile");

function getCurrentVersion() {

  if (!cdnPrefix) {
    if(cdnPrefixFile) {
      cdnPrefix = "/s/" + ("" + fs.readFileSync(cdnPrefixFile)).trim();
    }
    else {
      cdnPrefix = "";
    }
  }

  return cdnPrefix;
}

exports.getCurrentVersion = getCurrentVersion;