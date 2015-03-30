/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var execPreloads      = require('../exec-preloads');
var TroupeUriStrategy = require('./troupe-uri-strategy');
var billingService    = require('../../services/billing-service');

function OrgPlanStrategy() {
  var orgsWithPlans;

  this.preload = function(orgUris, callback) {
    return billingService.findActiveOrgPlans(orgUris)
      .then(function(subscriptions) {
        orgsWithPlans = subscriptions.reduce(function(memo, s) {
          memo[s.uri.toLowerCase()] = s.plan;
          return memo;
        }, {});

        return true;
      })
      .nodeify(callback);
  };

  this.map = function(orgUri) {
    return orgsWithPlans[orgUri.toLowerCase()];
  };
}

OrgPlanStrategy.prototype = {
  name: 'OrgPlanStrategy'
};


function GitHubOrgStrategy(options) {
  var troupeUriStrategy = new TroupeUriStrategy(options);
  var planStrategy = new OrgPlanStrategy();

  this.preload = function(orgs, callback) {
    var orgUris = orgs.map(function(org) { return org.login; });

    execPreloads([{
      strategy: troupeUriStrategy,
      data: orgUris
    },{
      strategy: planStrategy,
      data: orgUris
    }], callback);
  };

  this.map = function(item) {
    var plan = planStrategy.map(item.login);
    return {
      id: item.id,
      name: item.login,
      avatar_url: item.avatar_url,
      room: troupeUriStrategy.map(item.login),
      premium: !!plan,
    };
  };
}

GitHubOrgStrategy.prototype = {
  name: 'GitHubOrgStrategy'
};

module.exports = GitHubOrgStrategy;
