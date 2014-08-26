/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var collections       = require("../../utils/collections");
var execPreloads      = require('../exec-preloads');
var TroupeStrategy    = require('./troupe-strategy');
var leanTroupeDao     = require('../../services/daos/troupe-dao').lean;

function GithubRepoStrategy(options) {

  var troupeStrategy = new TroupeStrategy(options);
  var troupesIndexed;

  this.preload = function(userAdminRepos, callback) {
    var repos = userAdminRepos.map(function(repo) { return repo.full_name; });

    return leanTroupeDao.findByUris(repos)
      .then(function(troupes) {
        troupesIndexed = collections.indexByProperty(troupes, 'uri');

        return execPreloads([{
          strategy: troupeStrategy,
          data: troupes
        }]);
      })
      .nodeify(callback);
  };

  this.map = function(item) {
    var room = troupesIndexed[item.full_name];
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

GithubRepoStrategy.prototype = {
  name: 'GithubRepoStrategy'
};


module.exports = GithubRepoStrategy;
