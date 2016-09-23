'use strict';

var StatusError = require('statuserror');
var validators = require('gitter-web-validators');

function validateTopic(data, options) {
  options = options || {};

  // allowedTags should come from forum.tags
  options.allowedTags = options.allowedTags || [];

  if (!validators.validateDisplayName(data.title)) {
    throw new StatusError(400, 'Title is invalid.');
  }

  if (!validators.validateSlug(data.slug)) {
    throw new StatusError(400, 'Slug is invalid.');
  }

  if (!validators.validateSticky(data.sticky)) {
    throw new StatusError(400, 'Sticky is invalid.');
  }

  if (!validators.validateMarkdown(data.text)) {
    throw new StatusError(400, 'Text is invalid.');
  }

  if (!validators.validateTags(data.tags, options.allowedTags)) {
    throw new StatusError(400, 'Tags are invalid.');
  }

  return data;
}

module.exports = validateTopic;
