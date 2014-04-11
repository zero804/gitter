/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var Mirror = require("../../../services/github/github-mirror-service")('repo');
var converter = require('../../../utils/process-chat');
var util = require('util');
var highlight = require('highlight.js');

highlight.configure({classPrefix: ''});

module.exports = function(req, res, next) {
  var githubUri = 'repos/' + req.route.params[0];
  var mirror = new Mirror(req.user);

  mirror.get(githubUri).then(function(ghResponse) {
    if(req.query.renderMarkdown && ghResponse.body) {
      ghResponse.body_html = converter(ghResponse.body).html;
    }
    if(req.query.renderPatchIfSingle && ghResponse.files && ghResponse.files.length === 1 && ghResponse.files[0].patch) {
      ghResponse.files[0].patch_html = util.format('<pre><code>%s</code></pre>', highlight.highlight('diff', ghResponse.files[0].patch).value);
    }
    res.send(ghResponse);
  }).fail(next);

};
