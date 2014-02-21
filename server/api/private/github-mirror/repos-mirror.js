/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var Mirror = require("../../../services/github/github-mirror-service")('repo');
var converter = require('../../../utils/process-chat');

module.exports = function(req, res, next) {
  if(!req.user) return next(403);

  var githubUri = 'repos/'+req.route.params[0];
  var mirror = new Mirror(req.user);

  mirror.get(githubUri).then(function(ghResponse) {
    if(req.query.renderMarkdown && ghResponse.body) {
      ghResponse.body_html = converter(ghResponse.body).html;
    }
    res.send(ghResponse);
  }).fail(next);

};
