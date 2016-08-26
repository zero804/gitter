'use strict';

var validators = require('gitter-web-validators');
var StatusError = require('statuserror');

function validateCategory(data) {
  if (!validators.validateDisplayName(data.name)) {
    throw new StatusError(400, 'Name is invalid.');
  }

  if (!validators.validateSlug(data.slug)) {
    throw new StatusError(400, 'Slug is invalid.');
  }

  // TODO: uncomment as soon as we added it to the schema
  //if (!(data.order === undefined || Number.isInteger(data.order))) {
  //  throw new StatusError(400, 'Order is invalid.');
  //}

  return data;
}

module.exports = validateCategory;
