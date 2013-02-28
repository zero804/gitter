/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true */
"use strict";

var signupService = require("../services/signup-service"),
    passport = require('passport'),
    middleware = require('../web/middleware');

module.exports = {
    install: function(app) {
      app.get('/:troupeUri/accept/:confirmationCode',
        middleware.authenticate('accept', {}),
        function(req, res, next) {
            /* User has been set passport/accept */
            signupService.acceptInvite(req.params.confirmationCode, req.user, function(err, troupe) {
              if (err) {
                res.relativeRedirect("/" + req.params.troupeUri);
                return;
              }

              res.relativeRedirect("/" + troupe.uri);
          });
      });
    }
};