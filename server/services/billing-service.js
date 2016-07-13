"use strict";

var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');

function toLowerCase(value) {
  return value && value.toLowerCase();
}

exports.findActiveOrgPlans = function(orgUris) {
  if(!orgUris || !orgUris.length) return Promise.resolve([]);

  var query = mongoUtils.fieldInPredicate('lcUri', orgUris.map(toLowerCase), {
    subscriptionType: 'ORG',
    status: 'CURRENT'
  });

  return persistence.Subscription.find(query).exec();
};

exports.findActivePlan = function(uri) {
  var lcUri = toLowerCase(uri);

  return persistence.Subscription.findOne({
      lcUri: lcUri,
      status: 'CURRENT'
    })
    .exec();

};

exports.findActivePlans = function(uris) {
  if(!uris || !uris.length) return Promise.resolve([]);

  var query = mongoUtils.fieldInPredicate('lcUri', uris.map(toLowerCase), {
    status: 'CURRENT'
  });

  return persistence.Subscription.find(query).exec();
};
