/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service");

module.exports = {
    install: function(app) {
      app.get('/:appUri', function(req, res, next) {
        var appUri = req.params.appUri;

        troupeService.findByUri(appUri, function(err, troupe) {
          if(err) return next(err);
          if(!troupe) return next("Troupe: " + appUri + " not found.");


          if(req.user) {
            if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
              res.redirect("/" + appUri + "/accessdenied");
              return;
            }
          }

          var troupeContext = {
              user: req.user ? req.user.narrow() : null,
              troupe: {
                "uri": troupe.uri,
                "id": troupe.id,
                "name": troupe.name
              }
          };

          res.render('app', {
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