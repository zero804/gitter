/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";
var troupeService = require("../services/troupe-service");

module.exports = {
    install: function(app) {
      app.get('/mob', function(req, res, next) {
          console.log("MOBILE");

          var troupeContext = {
              user: req.user ? req.user.narrow() : null,
              troupe: {
                "uri": troupe.uri,
                "id": troupe.id,
                "name": troupe.name
              }
          };

          res.render('m/mobile', {
            troupeContext: JSON.stringify(troupeContext)
          });
      });
    }
};