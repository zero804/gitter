"use strict";

var processMarkdown = require('../../utils/markdown-processor');
var StatusError = require('statuserror');
var _ = require('lodash');

function markdownPreview(req, res, next) {
  if(!req.user) { return next(new StatusError(401)); }
  var data = _.clone(req.body);
  return processMarkdown(data.text)
    .then(function(parsed){
      res.json(200, parsed.html);
    })
    .catch(next);
}

module.exports = markdownPreview;
