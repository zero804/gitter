/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var RepoService =  require('../../services/github/github-repo-service');

module.exports = {
  index: function(req, res, next) {
    if(req.troupe.githubType != 'REPO') return res.send([]);

    var term = req.query.q || '';
    var service = new RepoService(req.user);
    var repoName = req.troupe.uri;

    service.getIssues(repoName).then(function(issues) {
      var matches = issues.filter(function(issue) {
        return (''+issue.number).indexOf(term) === 0;
      });

      res.send(matches);
    })
    .fail(function(err) {
      next(err);
    });

  }
};
