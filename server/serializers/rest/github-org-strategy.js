/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var _                 = require("underscore");
var collections       = require("../../utils/collections");
var execPreloads      = require('../exec-preloads');
var TroupeUriStrategy = require('./troupe-uri-strategy');
var billingService    = require('../../services/billing-service');
var env               = require('../../utils/env');


function OrgPremiumStatusStrategy() {
  var orgsWithPlans;

  this.preload = function(orgUris, callback) {
    return billingService.findActiveOrgPlans(orgUris)
      .then(function(subscriptions) {
        orgsWithPlans = subscriptions.reduce(function(memo, s) {
          memo[s.uri] = true;
          return memo;
        }, {});

        return true;
      })
      .nodeify(callback);
  };

  this.map = function(orgUri) {
    // TODO remove when premium goes live
    return env.config.get('premium:disabled') ? true : !!orgsWithPlans[orgUri];
  };

}

function GitHubOrgStrategy(options) {
  var troupeUriStrategy = new TroupeUriStrategy(options);
  var premiumStatusStrategy = new OrgPremiumStatusStrategy();

  this.preload = function(orgs, callback) {
    var orgUris = orgs.map(function(org) { return org.login; });

    execPreloads([{
      strategy: troupeUriStrategy,
      data: orgUris
    },{
      strategy: premiumStatusStrategy,
      data: orgUris
    }], callback);
  };

  this.map = function(item) {
    return {
      id: item.id,
      name: item.login,
      avatar_url: item.avatar_url,
      room: troupeUriStrategy.map(item.login),
      premium: premiumStatusStrategy.map(item.login)
    };
  };

}



module.exports = GitHubOrgStrategy;
