"use strict";

var billingService = require('../../../services/billing-service');

function ProOrgStrategy() {
  var proOrgs = {};

  function getOwner(uri) {
    return uri.split('/', 1).shift();
  }

  this.preload = function(troupes) {
    var uris = troupes.map(function(troupe) {
        if (!troupe.uri) return; // one-to-one
        return getOwner(troupe.uri);
      })
      .filter(function(room) {
        return !!room; // this removes the `undefined` left behind (one-to-ones)
      })
      .uniq();

    return billingService.findActiveOrgPlans(uris.toArray())
      .then(function(subscriptions) {
        subscriptions.forEach(function(subscription) {
          proOrgs[subscription.uri.toLowerCase()] = !!subscription;
        });
      });
  };

  this.map = function(troupe) {
    if (!troupe || !troupe.uri) return undefined;
    var owner = getOwner(troupe.uri).toLowerCase();
    return proOrgs[owner];
  };
}
ProOrgStrategy.prototype = {
  name: 'ProOrgStrategy'
};

module.exports = ProOrgStrategy;
