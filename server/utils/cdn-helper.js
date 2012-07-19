var nconf = require('./config').configure();
var fs = require("fs");

function passthrough(url) {
  return url;
}

function cdn(url) {
  var c  = this.cdnId === 0 || this.cdnId ? this.cdnId : -1;
  var d = (c + 1) % hostLength;
  this.cdnId = d;

  return "//" + hosts[d] +cdnPrefix + "/" + url;
}

var useCdn = nconf.get("cdn:use");
if(!useCdn) {
  module.exports = passthrough;
} else {
  var hosts = nconf.get("cdn:hosts");
  var cdnPrefix = nconf.get("cdn:prefix");
  if(cdnPrefix) {
    cdnPrefix = "/" + cdnPrefix;
  } else {
    var cdnPrefixFile = nconf.get("cdn:prefixFile");
    if(cdnPrefixFile) {
        cdnPrefix = "/" + ("" + fs.readFileSync(cdnPrefixFile)).trim();
    } else {
      cdnPrefix = "";
    }
  }

  var hostLength = hosts.length;

  module.exports = cdn;
}