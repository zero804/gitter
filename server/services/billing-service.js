"use strict";

var persistence = require('./persistence-service');
var mongoUtils = require('../utils/mongo-utils');
var Q = require('q');

function toLowerCase(value) {
  return value && value.toLowerCase();
}

exports.findActivePersonalPlansForUsers = function(userIds) {
  if(!userIds || !userIds.length) return Q.resolve([]);

  return persistence.Subscription.findQ({
    userId: { $in: userIds.map(mongoUtils.asObjectID) },
    subscriptionType: 'USER',
    status: 'CURRENT'
  });
};

exports.findActiveOrgPlans = function(orgUris) {
  if(!orgUris || !orgUris.length) return Q.resolve([]);

  return persistence.Subscription.findQ({
    lcUri: { $in: orgUris.map(toLowerCase) },
    subscriptionType: 'ORG',
    status: 'CURRENT'
  });
};

exports.findActivePlan = function(uri) {
  var lcUri = toLowerCase(uri);

  return persistence.Subscription.findOneQ({
    lcUri: lcUri,
    status: 'CURRENT'
  });

};

exports.findActivePlans = function(uris) {
  if(!uris || !uris.length) return Q.resolve([]);

  return persistence.Subscription.findQ({
    lcUri: { $in: uris.map(toLowerCase) },
    status: 'CURRENT'
  });
}
