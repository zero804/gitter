'use strict'

var assert = require('assert');
var KnownExternalAccess = require('gitter-web-persistence').KnownExternalAccess;
var env = require('gitter-web-env');
var errorReporter = env.errorReporter;

function handle(userId, type, policyName, linkPath, externalId, access) {
  var query = {
    userId: userId,
    type: type,
    policyName: policyName,
    $or: [{
      linkPath: linkPath
    }, {
      externalId: externalId
    }]
  };

  if (linkPath && externalId) {
    query.$or = [{
      linkPath: linkPath
    }, {
      externalId: externalId
    }];
  } else if (linkPath) {
    query.linkPath = linkPath;
  } else if (externalId) {
    query.externalId = externalId;
  } else {
    // This can never happen
    assert(false, 'Expected linkPath or externalId');
  }

  if (access) {
    return KnownExternalAccess.update(query, {
      $set: {
        userId: userId,
        type: type,
        policyName: policyName,
        linkPath: linkPath,
        externalId: externalId,
        accessTime: new Date()
      }
    }, {
      upsert: true
    });
  } else {
    return KnownExternalAccess.remove(query);
  }
}

function knownAccessRecorder(userId, type, policyName, linkPath, externalId, access) {
  if (!userId) return;
  if (!type) return;
  if (!policyName) return;
  if (!linkPath && !externalId) return;

  return handle(userId, type, policyName, linkPath, externalId, access)
    .catch(function(err) {
      errorReporter(err, { }, { module: 'known-access-recorder' });
    })
    .done();
}

module.exports = knownAccessRecorder;
