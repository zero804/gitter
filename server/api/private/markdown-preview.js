"use strict";

var processMarkdown = require('../../utils/markdown-processor');
var StatusError = require('statuserror');
var _ = require('lodash');

function markdownPreview(req, res, next) {
  if(!req.user) { return next(new StatusError(401)); }
  return processMarkdown(req.body.text)
    .then(function(parsed){
      res.json(200, parsed.html);
    })
    .catch(next);
}

module.exports = markdownPreview;
