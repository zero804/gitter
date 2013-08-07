/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var appVersion = require('../web/appVersion');
var nconf = require('../utils/config');

var currentVersion = appVersion.getCurrentVersion();
if(!currentVersion) currentVersion = Date.now();

var useAppCache = nconf.get('web:useAppCache');

function generateAppCache(req, res, next) {
  if(!useAppCache) return next(404);

  var page = req.params[1]; // chat / people / mails / files
  res.set('Content-Type', 'text/cache-manifest');
  res.render('appcache/' + page, { version: currentVersion });
}

module.exports = {
    install: function(app) {
      app.get(/^\/one-one\/\/([\w\.]+)\/(\w+).appcache$/, generateAppCache);
      app.get(/^\/([\w\.]+)\/(\w+).appcache$/, generateAppCache);
    }
};
