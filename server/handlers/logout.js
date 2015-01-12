/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var logout = require('../web/middlewares/logout');

exports.install = function(app) {
  /* Cheap trick for testing */
  app.get('/logout',
    logout,
    function(req, res) {
      res.relativeRedirect(nconf.get('web:homeurl'));
    });
};