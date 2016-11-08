"use strict";

var recentRoomCore = require('../../../services/core/recent-room-core');

function FavouriteTroupesForUserStrategy(options) {
  this.userId = options.userId || options.currentUserId;
  this.favs = null;
}

FavouriteTroupesForUserStrategy.prototype = {
  preload: function() {
    return recentRoomCore.findFavouriteTroupesForUser(this.userId)
      .bind(this)
      .then(function(favs) {
        this.favs = favs;
      });
  },

  map: function(id) {
    var favs = this.favs[id];
    return favs || undefined;
  },

  name: 'FavouriteTroupesForUserStrategy'
};

module.exports = FavouriteTroupesForUserStrategy;
