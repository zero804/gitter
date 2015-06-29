/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var recentRoomService = require('../services/recent-room-service');

/**
 * For a user who has nowhere to go? Where to Next?
 * @return promise of a relative URL
 */
function whereToNext(user) {
  return recentRoomService.findInitialRoomUrlForUser(user)
    .then(function(url) {
      if (url) return url;
      return user.username ? '/' + user.username : '/home';
    });
}
exports.whereToNext = whereToNext;

exports.redirectUserToDefaultTroupe = function(req, res, next) {
  return whereToNext(req.user)
    .then(function(url) {
      return res.relativeRedirect(url);
    })
    .fail(next);
};
