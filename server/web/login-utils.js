/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var userService = require("../services/user-service");
var troupeService = require("../services/troupe-service");
var nconf = require('../utils/config');

exports.redirectUserToDefaultTroupe = function(req, res, next, options) {

  var onNoValidTroupes = options ? options.onNoValidTroupes : null;

  //
  // This code is invoked when a user's lastAccessedTroupe is no longer valid (for the user)
  // or the user doesn't have a last accessed troupe. It looks for all the troupes that the user
  // DOES have access to (by querying the troupes.users collection in mongo)
  // If the user has a troupe, it takes them to the first one it finds. If the user doesn't have
  // any valid troupes, it redirects them to an error message
  //
  function findDefaultTroupeForUser() {
    userService.findDefaultTroupeForUser(req.user.id, function (err,troupe) {
      if (err || !troupe) {

        if(onNoValidTroupes) {
          return onNoValidTroupes();
        } else {
          return res.redirect(nconf.get('web:homeurl'));
        }

      }
      else {
        return res.redirect('/' + troupe.uri);
      }
    });
  }

  if (req.user.lastTroupe) {
    troupeService.findById(req.user.lastTroupe, function (err,troupe) {
      if (err || !troupe || !troupeService.userHasAccessToTroupe(req.user, troupe)) {
        findDefaultTroupeForUser();
        return;
      }

      res.redirect('/' + troupe.uri);
    });
  } else {
    findDefaultTroupeForUser();
  }

};
