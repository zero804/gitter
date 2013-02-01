/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var middleware = require('../web/middleware');
var nconf = require('../utils/config');

exports.install = function(app) {
  /* Cheap trick for testing */
  app.get('/signout',
    middleware.logout(),
    function(req, res) {
      res.relativeRedirect(nconf.get('web:homeurl'));
    });
};