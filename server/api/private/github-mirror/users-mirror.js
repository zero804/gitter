/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var Mirror      = require("../../../services/github/github-mirror-service")('user');
var userService = require('../../../services/user-service');

module.exports = function(req, res, next) {
  if(!req.user) return next(401);

  var githubUri = 'users/' + req.route.params[0];
  var mirror = new Mirror(req.user);

  mirror.get(githubUri).then(function(body) {
    if(body && body.login) {
      userService.githubUserExists(body.login, function(err, exists) {
        if(err) return res.send(body);

        body.has_gitter_login = exists;

        return res.send(body);
      });
    } else {
      res.send(body);
    }
  }).fail(next);

};
