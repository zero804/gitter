"use strict";

var Troupe = require('gitter-web-persistence').Troupe;
var Group = require('gitter-web-persistence').Group;
var assert = require('assert');
var StatusError = require('statuserror');
var Promise = require('bluebird');

function updateLinksForRepo(linkPath, newLinkPath, externalId) {
  assert(linkPath, 'linkPath expected');
  assert(newLinkPath, 'newLinkPath expected');

  var parts = newLinkPath.split('/');
  if (parts.length !== 2) {
    throw new StatusError(400, 'Invalid linkPath attribute');
  }

  if (!parts[0].length || !parts[1].length) {
    throw new StatusError(400, 'Invalid linkPath attribute: ' + linkPath);
  }

  var query = {
    'sd.type': 'GH_REPO',
    'sd.linkPath': linkPath
  };

  var update = {
    $set: {
      'sd.linkPath': newLinkPath
    }
  };

  if (externalId) {
    update.$set['sd.externalId'] = externalId;
  }

  return Promise.join(
    Troupe.update(query, update, { multi: true }).exec(),
    Group.update(query, update, { multi: true }).exec());

  // TODO: consider sending live-collection updates
}

function updatePublicFlagForRepo(linkPath, isPublic) {
  assert(linkPath, 'linkPath expected');
  assert(isPublic === true || isPublic === false, 'isPublic must be a boolean');

  var query = {
    'sd.type': 'GH_REPO',
    'sd.linkPath': linkPath
  };

  var update = {
    $set: {
      'sd.public': isPublic
    }
  };

  return Promise.join(
    Troupe.update(query, update, { multi: true }).exec(),
    Group.update(query, update, { multi: true }).exec());

  // TODO: consider sending live-collection updates
}

module.exports = {
  updateLinksForRepo: updateLinksForRepo,
  updatePublicFlagForRepo: updatePublicFlagForRepo,
};
