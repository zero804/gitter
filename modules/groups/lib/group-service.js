'use strict';

var Promise = require('bluebird');
var Group = require('gitter-web-persistence').Group;
var assert = require('assert');
var validateGroupName = require('gitter-web-validators/lib/validate-group-name');
var validateGroupUri = require('gitter-web-validators/lib/validate-group-uri');
var StatusError = require('statuserror');

function findById(groupId) {
  return Group.findById(groupId)
    .lean()
    .exec();
}

function createGroup(options) {
  var name = options.name;
  var uri = options.uri;
  assert(name, 'name required');
  assert(uri, 'name required');

  if(!validateGroupName(name)) {
    throw new StatusError(400, 'Invalid group name');
  }

  if(!validateGroupUri(uri)) {
    throw new StatusError(400, 'Invalid group uri');
  }

  var lcUri = uri.toLowerCase();

  var group = new Group({
    name: name,
    uri: uri,
    lcUri: lcUri
  });

  return group.save();
}

module.exports = {
  findById: Promise.method(findById),
  createGroup: Promise.method(createGroup)
};
