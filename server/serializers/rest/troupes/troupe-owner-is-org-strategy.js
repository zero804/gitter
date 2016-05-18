"use strict";

var troupeService = require('../../../services/troupe-service');
var _ = require("lodash");
var Promise = require('bluebird');

function TroupeOwnerIsOrgStrategy(){
  this.ownerHash = null;
}

TroupeOwnerIsOrgStrategy.prototype = {
  preload: function(troupes) {
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
      .bind(this)
      .then(function(results) {
        this.ownerHash = _.reduce(ownersForQuery, function(memo, lcOwner, index) {
          memo[lcOwner] = results[index];
          return memo;
        }, {});
      });
  },

  map: function (troupe) {
    return !!this.ownerHash[troupe.lcOwner];
  },

  name: 'TroupeOwnerIsOrgStrategy'
};

module.exports = TroupeOwnerIsOrgStrategy;
