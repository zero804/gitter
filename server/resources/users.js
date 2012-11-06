/*jshint globalstrict:true, trailing:false node:true*/
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    userService = require("../services/user-service"),
    restSerializer = require("../serializers/rest-serializer"),
    _ = require("underscore");

module.exports = {
    index: function(req, res, next) {


      var strategy = new restSerializer.UserIdStrategy();

      restSerializer.serialize(req.troupe.users, strategy, function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
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
