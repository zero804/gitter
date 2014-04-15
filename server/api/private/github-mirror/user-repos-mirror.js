/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var Mirror      = require("../../../services/github/github-mirror-service")('repo');

module.exports = function(req, res, next) {
  var githubUri = 'user/repos';
  var mirror = new Mirror(req.user);

  mirror.get(githubUri).then(function(body) {
    return res.send(body);
  }).fail(next);

};
