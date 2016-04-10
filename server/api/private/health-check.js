"use strict";

var os         = require("os");
var nconf      = require('../../utils/config');
var appVersion = require('app-version');

module.exports = function(req, res) {
  res.send("OK from " + os.hostname() + ":" + nconf.get('PORT') + ", running " + appVersion.getVersion());
};

