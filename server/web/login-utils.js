/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var userService = require("../services/user-service");
var troupeService = require("../services/troupe-service");

exports.redirectUserToDefaultTroupe = function(req, res, next) {
  function findDefaultTroupeForUser() {
    userService.findDefaultTroupeForUser(req.user.id, function (err,troupe) {
      // TODO: deal with users who do not belong to any troupes!
      if (err || !troupe) { return next("Unable to find default troupe for user. "); }

      res.redirect('/' + troupe.uri);
    });
  }

  if (req.user.lastTroupe) {
    troupeService.findById(req.user.lastTroupe, function (err,troupe) {
      if (err || !troupe) {
        findDefaultTroupeForUser();
        return;
      }

      res.redirect('/' + troupe.uri);
    });
  } else {
    findDefaultTroupeForUser();
  }

};
