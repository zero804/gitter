/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
passport = require('passport');

module.exports = {
    install: function(app) {
      app.get('/accept/:confirmationCode',
        passport.authenticate('accept'),
        function(req, res, next) {
          /* User has been set passport/accept */
          troupeService.acceptInvite(req.params.confirmationCode, req.user, function(err, troupe) {
            if(!req.user.passwordHash) {
              res.redirect("/profile");
              return;
            }

            res.redirect("/" + troupe.uri);

          });

        }
      );
    }
};