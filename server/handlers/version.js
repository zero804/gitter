/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var appVersion      = require("../web/appVersion");

module.exports = {
    install: function(app) {
      app.get('/version', function(req, res/*, next*/) {
        res.json({ appVersion: appVersion.getAppTag() });
      });
    }
};
