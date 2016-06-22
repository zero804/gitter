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
      return user.username ? '/' + user.username : '/home/explore';
    });
}
exports.whereToNext = whereToNext;

exports.redirectUserToDefaultTroupe = function(req, res, next) {
  return whereToNext(req.user)
    .then(function(url) {
      if (req.session) {
        req.session.preserveLeftMenuState = true;
      }
      return res.relativeRedirect(url);
    })
    .catch(next);
};
