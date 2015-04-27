/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var troupeService = require("../services/troupe-service");
var recentRoomService = require('../services/recent-room-service');
var promiseUtils = require("../utils/promise-utils");

/**
 * For a user who has nowhere to go? Where to Next?
 * @return promise of a relative URL
 */
exports.whereToNext = function(user, callback) {

  return recentRoomService.findBestTroupeForUser(user)
    .then(promiseUtils.required)
    .then(function(troupe) {
      return troupeService.getUrlForTroupeForUserId(troupe, user.id)
        .then(promiseUtils.required);
    })
    .fail(function() {
      /* Fall back to userhome */
      return user.username ? '/' + user.username : '/home';
    })
    .nodeify(callback);

};

exports.redirectUserToDefaultTroupe = function(req, res, next) {
  return exports.whereToNext(req.user)
    .then(function(url) {
      return res.relativeRedirect(url);
    })
    .fail(next);

};
