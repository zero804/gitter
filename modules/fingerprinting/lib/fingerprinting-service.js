'use strict';

var Fingerprint = require('gitter-web-persistence').Fingerprint;
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var ObjectID = require('mongodb').ObjectID;

var MAX_FINGERPRINTS_PER_USER = 5;

function recordFingerprint(userId, fingerprint, ipAddress) {
  return mongooseUtils.safeUpsertUpdate(Fingerprint, { userId: userId }, {
    $setOnInsert: {
      userId: userId
    },
    $push: {
      fingerprints: {
        $each: [{
          _id: new ObjectID(),
          fingerprint: fingerprint,
          ipAddress: ipAddress
        }],
        $sort: {
          _id: -1 // Keep the most recent ones
        },
        $slice: MAX_FINGERPRINTS_PER_USER
      }
    }

  });
}

module.exports = {
  recordFingerprint: recordFingerprint
};
