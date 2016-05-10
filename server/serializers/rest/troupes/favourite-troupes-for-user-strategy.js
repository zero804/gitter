"use strict";

var recentRoomCore = require('../../../services/core/recent-room-core');

function FavouriteTroupesForUserStrategy(options) {
  var self = this;
  var userId = options.userId || options.currentUserId;

  this.preload = function() {
    return recentRoomCore.findFavouriteTroupesForUser(userId)
      .then(function(favs) {
        self.favs = favs;
      });
  };

  this.map = function(id) {
    var favs = self.favs[id];
    if (!favs) return undefined;
    if (favs === '1') return 1000;
    return favs;
  };
}

FavouriteTroupesForUserStrategy.prototype = {
  name: 'FavouriteTroupesForUserStrategy'
};

module.exports = FavouriteTroupesForUserStrategy;
