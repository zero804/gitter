/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    userService = require("../services/user-service"),
    presenceService = require("../services/presence-service"),
    Q = require("q");

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

    destroy: function(req, res){
      res.send(500);
    },

    load: function(req, id, callback) {
      throw new Error("");
    }

};
