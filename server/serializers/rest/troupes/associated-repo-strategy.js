"use strict";

var Promise = require('bluebird');
var roomRepoService = require('../../../services/room-repo-service');


function AssociatedRepoStrategy(/*options*/) {
  this.associatedRepos = {};
}

AssociatedRepoStrategy.prototype = {
  preload: function(items) {
    return Promise.all(items.toArray().map(function(item) {
      return roomRepoService.findAssociatedGithubRepoForRoom(item)
        .bind(this)
        .then(function(repoUri) {
          this.associatedRepos[item.id] = repoUri;
        })
    }.bind(this)))
  },

  map: function(id) {
    return this.associatedRepos[id];
  },

  name: 'AssociatedRepoStrategy'
};

module.exports = AssociatedRepoStrategy;
