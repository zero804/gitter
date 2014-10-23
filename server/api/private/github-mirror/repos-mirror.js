"use strict";

var Mirror = require("../../../services/github/github-mirror-service")('repo');
var processChat = require('../../../utils/markdown-processor');
var util = require('util');
var highlight = require('highlight.js');

highlight.configure({classPrefix: ''});

module.exports = function(req, res, next) {
  var githubUri = 'repos/' + req.route.params[0];
  var mirror = new Mirror(req.user);

  mirror.get(githubUri)
    .then(function(ghResponse) {
      if(req.query.renderMarkdown && ghResponse.body) {
        return processChat(ghResponse.body)
          .then(function(result) {
            ghResponse.body_html = result.html;
            return ghResponse;
          });
      }

      // TODO: handle async processing of diffs
      if(req.query.renderPatchIfSingle && ghResponse.files && ghResponse.files.length === 1 && ghResponse.files[0].patch) {
        ghResponse.files[0].patch_html = util.format('<pre><code>%s</code></pre>', highlight.highlight('diff', ghResponse.files[0].patch).value);
      }

      return ghResponse;
    })
    .then(function(ghResponse) {
      res.send(ghResponse);
    }).fail(function(err) {
      if(err.statusCode) {
        res.send(err.statusCode);
      } else {
        next(err);
      }
    });

};
