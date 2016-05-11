"use strict";

var collections    = require("../../utils/collections");
var TroupeStrategy = require('./troupe-strategy');
var leanTroupeDao  = require('../../services/daos/troupe-dao').full;
var Lazy           = require('lazy.js');

function GithubRepoStrategy(options) {
  var troupeStrategy = new TroupeStrategy(options);
  var troupesIndexed;

  this.preload = function(repos) {
    var repoFullNames = repos.map(function(repo) {
        return repo.full_name;
      })
      .toArray();

    return leanTroupeDao.findByUris(repoFullNames)
      .then(function(troupes) {
        troupesIndexed = collections.indexByProperty(troupes, 'uri');

        return troupeStrategy.preload(Lazy(troupes));
      });
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
      exists:       !!room,
      avatar_url:   item.owner.avatar_url
    };
  };

}

GithubRepoStrategy.prototype = {
  name: 'GithubRepoStrategy'
};


module.exports = GithubRepoStrategy;
