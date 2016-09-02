'use strict';

var StatusError = require('statuserror');
var validators = require('gitter-web-validators');

function validateReply(data) {
  if (!validators.validateMarkdown(data.text)) {
    throw new StatusError(400, 'Text is invalid.')
  }

  return data;
}

module.exports = validateReply;
