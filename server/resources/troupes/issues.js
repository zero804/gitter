/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var RepoService =  require('../../services/github/github-repo-service');

module.exports = {
  index: function(req, res) {
    var term = req.query.q || '';

    var service = new RepoService(req.session.user);

    service.getIssues('twbs/bootstrap').then(function(issues) {
      var matches = issues.filter(function(issue) {
        return (''+issue.number).indexOf(term) === 0;
      });

      res.send(matches);
    });

  }
};
