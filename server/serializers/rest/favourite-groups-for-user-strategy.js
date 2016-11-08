"use strict";

var groupCore = require('../../services/core/group-core');

// Based on ./server/serializers/rest/troupes/favourite-troupes-for-user-strategy.js
function FavouriteGroupsForUserStrategy(options) {
  this.userId = options.userId || options.currentUserId;
  this.favs = null;
}

FavouriteGroupsForUserStrategy.prototype = {
  preload: function() {
    return groupCore.findFavouriteGroupsForUser(this.userId)
      .bind(this)
      .then(function(favs) {
        this.favs = favs;
      });
  },

  map: function(id) {
    var favs = this.favs[id];
    if (!favs) return undefined;

    if (favs === '1') return 1000;
    return favs;
  },

  name: 'FavouriteGroupsForUserStrategy'
};

module.exports = FavouriteGroupsForUserStrategy;
