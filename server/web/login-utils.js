/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var troupeService = require("../services/troupe-service");

/**
 * For a user who has nowhere to go? Where to Next?
 * @return promise of a relative URL
 */
exports.whereToNext = function(user, callback) {

  return troupeService.findBestTroupeForUser(user)
    .then(function(troupe) {
    if(!troupe) return user.getHomeUrl();

    return troupe.getUrl(user.id);
  }).nodeify(callback);

};

exports.redirectUserToDefaultTroupe = function(req, res, next, options) {

  exports.whereToNext(req.user, function(err, url) {
    if (err || !url) {
      /* All dressed up but nowhere to go? */
      if(options && options.onNoValidTroupes) {
        return options.onNoValidTroupes();
      }

      return res.redirect("/home");
    }

    return res.relativeRedirect(url);
  });

};
