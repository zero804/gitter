/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var troupeService = require("../services/troupe-service");
var nconf = require('../utils/config');

exports.whereToNext = function(user, callback) {

  troupeService.findBestTroupeForUser(user, function(err, troupe) {
    if(err) return callback(err);
    if(!troupe) return callback();

    return callback(null, troupe.getUrl(user.id));
  });

};

exports.redirectUserToDefaultTroupe = function(req, res, next, options) {

  exports.whereToNext(req.user, function(err, url) {
    if (err || !url) {
      /* All dressed up but nowhere to go? */
      if(options && options.onNoValidTroupes) {
        return options.onNoValidTroupes();
      }

      return res.redirect(nconf.get('web:homeurl'));
    }

    return res.relativeRedirect(url);
  });

};
