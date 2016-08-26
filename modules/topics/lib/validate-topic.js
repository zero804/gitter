'use strict';

var StatusError = require('statuserror');
var validators = require('gitter-web-validators');

function validateTopic(data, options) {
  options = options || {};
  options.allowedTags = options.allowedTags || [];

  if (!validators.validateDisplayName(data.title)) {
    throw new StatusError(400, 'Title is invalid.')
  }

  if (!validators.validateSlug(data.slug)) {
    throw new StatusError(400, 'Slug is invalid.')
  }

  if (!validators.validateMarkdown(data.text)) {
    throw new StatusError(400, 'Text is invalid.')
  }

  // TODO: validate data.tags against options.allowedTags

  return data;
}

module.exports = validateTopic;
