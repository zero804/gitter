/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var collections       = require("../../utils/collections");
var execPreloads      = require('../exec-preloads');
var TroupeStrategy    = require('./troupe-strategy');

function GithubRepoStrategy(options) {

  var troupeStrategy = new TroupeStrategy(options);
  var self = this;

  this.preload = function(userAdminRepos, callback) {
    var repos = userAdminRepos.map(function(repo) { return repo.full_name; });

    troupeService.findAllByUri(repos, function(err, troupes) {
      if (err) callback(err);

      self.troupes = collections.indexByProperty(troupes, 'uri');

      execPreloads([{
        strategy: troupeStrategy,
        data: troupes
      }], callback);
    });
  };

  this.map = function(item) {
    var room = self.troupes[item.full_name];
    return {
      id:           item.id,
      name:         item.full_name,
      description:  item.description,
      uri:          item.full_name,
      private:      item.private,
      room:         room ? troupeStrategy.map(room) : undefined,
      avatar_url:   item.owner.avatar_url
    };
  };

}
module.exports = GithubRepoStrategy;
