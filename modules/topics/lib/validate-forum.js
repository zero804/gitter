'use strict';

var StatusError = require('statuserror');
var validators = require('gitter-web-validators');


function validateForum(data) {
  if (data.tags && !validators.validateTags(data.tags)) {
    throw new StatusError(400, 'Tags are invalid.');
  }
  return data;
}

module.exports = validateForum;
