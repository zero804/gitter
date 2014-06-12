"use strict";

var persistence = require('./persistence-service');
var mongoUtils = require('../utils/mongo-utils');

exports.findActivePersonalPlansForUsers = function(userIds) {
  if(!userIds || !userIds.length) return Q.resolve([]);

  return persistence.Subscription.findQ({
    userId: { $in: userIds.map(mongoUtils.asObjectID) },
    subscriptionType: 'USER',
    status: 'CURRENT'
  });
}

exports.findActiveOrgPlans = function(orgUris) {
  if(!orgUris || !orgUris.length) return Q.resolve([]);

  return persistence.Subscription.findQ({
    uri: { $in: orgUris },
    subscriptionType: 'ORG',
    status: 'CURRENT'
  });
}
