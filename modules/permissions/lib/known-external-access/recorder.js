'use strict'

var assert = require('assert');
var KnownExternalAccess = require('gitter-web-persistence').KnownExternalAccess;
var env = require('gitter-web-env');
var errorReporter = env.errorReporter;

function generateQuery(userId, type, policyName, linkPath, externalId) {
  var query = {
    userId: userId,
    type: type,
    policyName: policyName
  };

  if (linkPath && externalId) {
    query.$or = [{
      linkPath: linkPath
    }, {
      externalId: externalId
    }];

    return query;
  }

  if (linkPath) {
    query.linkPath = linkPath;
    return query;
  }

  if (externalId) {
    query.externalId = externalId;
    return query;
  }

  assert(false, 'Expected linkPath or externalId');
}

function handle(userId, type, policyName, linkPath, externalId, access) {
  var query = generateQuery(userId, type, policyName, linkPath, externalId);

  if (access) {
    // User has access? Upsert
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
    })
    .exec()
  } else {
    // User does not have access? Remove
    return KnownExternalAccess.remove(query)
      .exec();
  }
}

/**
 * Records whether a user was granted or denied access to a particular security policy
 */
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
module.exports.testOnly = {
  generateQuery: generateQuery,
  handle: handle
}
