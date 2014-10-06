/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var Mirror      = require("../../../services/github/github-mirror-service")('user');
var userService = require('../../../services/user-service');

module.exports = function (req, res, next) {
  var githubUri = 'users/' + req.route.params[0];
  var mirror = new Mirror(req.user);

  mirror.get(githubUri)
    .then(function (body) {
      if(!body || !body.login) return res.send(body);

        return userService.findByUsername(body.login)
          .then(function(user) {
            body.has_gitter_login = user ? true : undefined;

            if(user) {
              body.invited = user.isInvited() ? true : undefined;
              body.removed = user.isRemoved() ? true : undefined;
            }

            res.send(body);
          });
    })
    .fail(next);
};
