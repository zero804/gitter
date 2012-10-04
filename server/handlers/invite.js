/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
passport = require('passport');

module.exports = {
    install: function(app) {
      app.get('/:troupeUri/accept/:confirmationCode', function(req, res, next) {
        passport.authenticate('accept',  function(err, user, info) {
          if(err || !user) {
            res.relativeRedirect("/" + req.params.troupeUri);
            return;
          }
          /* User has been set passport/accept */
          troupeService.acceptInvite(req.params.confirmationCode, req.user, function(err, troupe) {
            if (err) {
              res.relativeRedirect("/" + req.params.troupeUri);
            }

            res.relativeRedirect("/" + troupe.uri);

          });

        })(req,res, next);
      });
    }
};