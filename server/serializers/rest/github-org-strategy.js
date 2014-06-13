/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var _                 = require("underscore");
var collections       = require("../../utils/collections");
var execPreloads      = require('../exec-preloads');
var TroupeStrategy    = require('./troupe-strategy');

function GitHubOrgStrategy(options) {

  var troupeStrategy = new TroupeStrategy(options);
  var self = this;

  this.preload = function(orgs, callback) {
    var _orgs = _.map(orgs, function(org) { return org.login; });

    troupeService.findAllByUri(_orgs, function(err, troupes) {
      if (err) callback(err);

      self.troupes = collections.indexByProperty(troupes, 'uri');

      execPreloads([{
        strategy: troupeStrategy,
        data: troupes
      }], callback);
    });
  };

  this.map = function(item) {
    var room = self.troupes[item.login];
    return {
      id: item.id,
      name: item.login,
      avatar_url: item.avatar_url,
      room: room ? troupeStrategy.map(room) : undefined
    };
  };

}

module.exports = GitHubOrgStrategy;
