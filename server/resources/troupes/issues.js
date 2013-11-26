/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var IssueService =  require('../../services/github/github-issue-service');

module.exports = {
  index: function(req, res) {
    var term = req.query.q || '';
    var service = new IssueService(req.session.user);
    service.getIssues().then(function(issues) {
      var matches = issues.filter(function(issue) {
        return (''+issue.number).indexOf(term) === 0;
      });
      res.send(matches);
    });
  }
};
