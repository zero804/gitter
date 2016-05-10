"use strict";

var troupeService = require('../../../services/troupe-service');
var _ = require("lodash");
var Promise = require('bluebird');

var TroupeOwnerIsOrgStrategy = function (){
  var ownerHash;

  this.preload = function(troupes) {
    // Use uniq as the list of items will probably be much smaller than the original set,
    // this means way fewer queries to mongodb
    var ownersForQuery = troupes.map(function(troupe){
        return troupe.lcOwner;
      })
      .filter(function(t) {
        return !!t;
      })
      .uniq()
      .toArray();

    return Promise.map(ownersForQuery, function(lcOwner){
        return troupeService.checkGitHubTypeForUri(lcOwner || '', 'ORG');
      })
      .then(function(results) {
        ownerHash = _.reduce(ownersForQuery, function(memo, lcOwner, index) {
          memo[lcOwner] = results[index];
          return memo;
        }, {});
      });

  };

  this.map = function (troupe) {
    return !!ownerHash[troupe.lcOwner];
  };
};

TroupeOwnerIsOrgStrategy.prototype = {
  name: 'TroupeOwnerIsOrgStrategy'
};

module.exports = TroupeOwnerIsOrgStrategy;
