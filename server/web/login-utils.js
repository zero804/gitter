/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var troupeService = require("../services/troupe-service");
var winston = require('winston');
var promiseUtils = require("../utils/promise-utils");

/**
 * For a user who has nowhere to go? Where to Next?
 * @return promise of a relative URL
 */
exports.whereToNext = function(user, callback) {

  return troupeService.findBestTroupeForUser(user)
    .then(function(troupe) {


      if(!troupe) return user.getHomeUrl();

      return troupeService.getUrlForTroupeForUserId(troupe, user.id, function(err, url) {
        if(url) return url;

        return user.getHomeUrl();
      });


    }).nodeify(callback);

};

exports.redirectUserToDefaultTroupe = function(req, res, next, options) {

  return exports.whereToNext(req.user)
    .then(promiseUtils.required)
    .then(function(url) {
      return res.relativeRedirect(url);
    })
    .fail(function(err) {
      /* All dressed up but nowhere to go? */
      if(options && options.onNoValidTroupes) {
        return options.onNoValidTroupes();
      }

      winston.verbose('[login-utils] redirectUserToDefaultTroupe failed ' + err, { exception: err });

      if (req.user.hasUsername()) {
        res.relativeRedirect(req.user.getHomeUrl());
      } else {
        res.relativeRedirect('/home');
      }
    });


};
