/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    passport = require('passport'),
    middleware = require('../web/middleware');

module.exports = {
    install: function(app) {
      app.get('/:troupeUri/accept/:confirmationCode',
        middleware.authenticate('accept', {}),
        function(req, res, next) {
            /* User has been set passport/accept */
            troupeService.acceptInvite(req.params.confirmationCode, req.user, function(err, troupe) {
              if (err) {
                res.relativeRedirect("/" + req.params.troupeUri);
                return;
              }

              res.relativeRedirect("/" + troupe.uri);
          });
      });
    }
};