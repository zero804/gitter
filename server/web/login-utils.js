/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var troupeService = require("../services/troupe-service");
var nconf = require('../utils/config');

exports.redirectUserToDefaultTroupe = function(req, res, next, options) {

  var onNoValidTroupes = options ? options.onNoValidTroupes : null;

  troupeService.findBestTroupeForUser(req.user, function(err, troupe) {
    if (err || !troupe) {
        if(onNoValidTroupes) {
          return onNoValidTroupes();
        } else {
          return res.redirect(nconf.get('web:homeurl'));
        }
      }

      return res.redirect(troupe.getUrl(req.user.id));
  });

};
