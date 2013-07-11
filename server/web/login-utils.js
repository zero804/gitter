/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var troupeService = require("../services/troupe-service");
var promiseUtils = require("../utils/promise-utils");

/**
 * For a user who has nowhere to go? Where to Next?
 * @return promise of a relative URL
 */
exports.whereToNext = function(user, callback) {

  return troupeService.findBestTroupeForUser(user)
    .then(promiseUtils.required)
    .then(function(troupe) {
      console.log('TROUPE', troupe);
      return troupeService.getUrlForTroupeForUserId(troupe, user.id)
        .then(promiseUtils.required);
    })
    .fail(function() {
      return user.hasUsername() ? user.getHomeUrl() : '/home';
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
