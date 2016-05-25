"use strict";

var processMarkdown = require('../../utils/markdown-processor');
var StatusError = require('statuserror');
var _ = require('lodash');

function markdownPreview(req, res, next) {
  if(!req.user) { throw new StatusError(404); }
  var data = _.clone(req.body);
  processMarkdown(data.content)
    .then(function(parsed){
      res.json(200, parsed.html);
    })
    .catch(next);
}

module.exports = markdownPreview;
