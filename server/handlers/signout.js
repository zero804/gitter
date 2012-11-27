/*jslint node: true */
"use strict";

var middleware = require('../web/middleware');

exports.install = function(app) {
  /* Cheap trick for testing */
  app.get('/signout',
    middleware.logout(),
    function(req, res) {
      res.relativeRedirect('/x');
    });
};