/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    userService = require("../services/user-service"),
    presenceService = require("../services/presence-service"),
    Q = require("q"),
    _ = require("underscore");

module.exports = {
    index: function(req, res, next) {
      var usersDeferred = Q.defer();
      var presenceDeferred = Q.defer();

      userService.findByIds(req.troupe.users, usersDeferred.node());
      presenceService.findOnlineUsersForTroupe(req.troupe.id, presenceDeferred.node());

      Q.all([usersDeferred.promise, presenceDeferred.promise]).spread(function(users, presence) {
        console.dir(presence);
        var a = users.narrow();
        a.forEach(function(item) {
          item.online = presence.indexOf(item.id) >= 0;
        });

        res.send(a);
      }).fail(function(error) {
        next(error);
      });
    },

    'new': function(req, res){
      res.send(500);
    },

    create: function(req, res) {
      res.send(500);
    },

    show: function(req, res){
      res.send(500);
    },

    edit: function(req, res){
      res.send(500);
    },

    update:  function(req, res){
      res.send(500);
    },

    destroy: function(req, res, next){
      var user = req.user; // NB NB NB, not the usual req.user, but the req.RESOURCEish user. Capish? 
      troupeService.removeUserFromTroupe(req.troupe._id, user.id, function (err) {
      if(err) return next(err);
        res.send(200);
      });
    },

    load: function(req, id, callback) {
      var userInTroupeId = _.find(req.troupe.users, function(v) { console.log(v); return v == id;} );
      userService.findById(userInTroupeId, callback);
    }

};
