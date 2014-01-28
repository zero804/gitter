/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GithubMe  = require("../../services/github/github-me-service");

module.exports = {
  index: function(req, res, next) {
    if(!req.user) {
      return next(403);
    }

    var user = new GithubMe(req.user);

    user.getEmail().then(function(email) {
      res.send([email]);
    }).fail(next);
  }
};
