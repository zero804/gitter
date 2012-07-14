/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service");
var userService = require("../services/user-service");

module.exports = {
    install: function(app) {
      app.get('/:appUri', function(req, res, next) {
        var appUri = req.params.appUri;

        troupeService.findByUri(appUri, function(err, troupe) {
          if(err) return next(err);
          if(!troupe) return next("Troupe: " + appUri + " not found.");

          var profileNotCompleted;

          var troupeData = {
            "uri": troupe.uri,
            "id": troupe.id,
            "name": troupe.name
          };
          var accessDenied;

          if(req.user) {
            if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
              accessDenied = true;
              troupeData = null;
            }

            profileNotCompleted = req.user.status == 'PROFILE_NOT_COMPLETED';

          } else {
            troupeData = null;
          }

          var troupeContext = {
              user: req.user ? req.user.narrow() : null,
              troupe: troupeData,
              profileNotCompleted: profileNotCompleted,
              accessDenied: accessDenied
          };

          var page;
          if(req.headers['user-agent'].indexOf('Mobile') >= 0) {
            page = 'm/mobile';
          } else {
            page = 'app';
          }

          var startScript, troupeName;
          if(req.user && !profileNotCompleted && troupeData) {
            startScript = "app";
            troupeName = troupe.name;
          } else {
            startScript = "app-login";
            if(profileNotCompleted) {
              troupeName = troupe.name;
            } else {
              troupeName = "Welcome";
            }
          }

          console.log("startScript", startScript);
          console.log("troupeName", troupeName);

          res.render(page, {
            startScript: startScript,
            troupeName: troupeName,
            troupeContext: JSON.stringify(troupeContext)
          });

        });

      });

      app.get('/:appUri/accessdenied', function(req, res, next) {
        res.render('app-accessdenied', {
        });
      });
    }
};