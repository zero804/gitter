/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var appVersion = require('../web/appVersion');
var nconf = require('../utils/config');

var currentVersion = appVersion.getVersion();

var useAppCache = nconf.get('web:useAppCache');
var minified = nconf.get('web:minified');

module.exports = {
    install: function(app) {
      app.get(/^\/mobile\/(\w+).appcache$/,
    function(req, res, next) {
      if(!useAppCache) return next(404);

      var page = req.params[0]; // chat / people / mails / files

      res.setHeader("Cache-Control", "public, max-age=0");
      res.setHeader("Expires", new Date().toUTCString());
      res.setHeader('Content-Type', 'text/cache-manifest');

      res.render('appcache/' + page, {
        version: currentVersion,
        minified: minified
      });

    });
}
};
