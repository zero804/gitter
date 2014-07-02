/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var os         = require("os");
var nconf      = require('../../utils/config');
var appVersion = require('../../web/appVersion');

module.exports = function(req, res) {
  res.send("OK from " + os.hostname() + ":" + nconf.get('PORT') + ", running " + appVersion.getVersion());
};

