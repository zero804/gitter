'use strict';

var validators = require('gitter-web-validators');
var StatusError = require('statuserror');
var _ = require('lodash');

function validateCategory(data) {
  if (!validators.validateDisplayName(data.name)) {
    throw new StatusError(400, 'Name is invalid.');
  }

  if (!validators.validateSlug(data.slug)) {
    throw new StatusError(400, 'Slug is invalid.');
  }

  if (!(data.order === undefined || _.isInteger(data.order))) {
    throw new StatusError(400, 'Order is invalid.');
  }

  return data;
}

module.exports = validateCategory;
