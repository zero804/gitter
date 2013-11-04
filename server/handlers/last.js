/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var troupeService   = require("../services/troupe-service");
var middleware      = require('../web/middleware');
var loginUtils      = require('../web/login-utils');

module.exports = {
    install: function(app) {
      app.get('/last',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          loginUtils.redirectUserToDefaultTroupe(req, res, next);
        });

      app.get('/last/:page',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {

          return troupeService.findBestTroupeForUser(req.user)
            .then(function(troupe) {
              if(troupe) {
                return '/mobile/' + req.params.page + '#' + troupe.id;
              }

              if(req.user.hasUsername()) {
                return req.user.getHomeUrl();
              } else {
                return "/home";
              }

            })
            .then(function(url) {
              res.relativeRedirect(url);
            })
            .fail(next);

        });
  }
};
