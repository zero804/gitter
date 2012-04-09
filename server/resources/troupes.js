/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
  userService = require("../services/user-service"),
  collections = require("../utils/collections");

module.exports = {
  index: function(req, res) {
    if(!req.user) {
      return res.send(403);
    }

    troupeService.findAllTroupesForUser(req.user.id, function(err, troupes) {
      if (err) return res.send(500);

      res.send(troupes.narrow());
    });
  },

  new: function(req, res) {
    res.send('new troupe');
  },

  create: function(req, res) {
    res.send('create troupe');
  },

  show: function(req, res) {
    var t = req.troupe;

    userService.findByIds(t.users, function(err, users) {
      if (err) return res.send(500);

      var usersIndexed = users.indexById();

      res.send({
        id: t._id,
        name: t.name,
        uri: t.uri,
        users: t.users.map(function(userId) {
          return usersIndexed[userId];
        }).filterNulls().narrow()
      });
    });

  },

  edit: function(req, res) {
    res.send('edit forum ' + req.troupe.title);
  },

  update: function(req, res) {
    res.send('update forum ' + req.troupe.title);
  },

  destroy: function(req, res) {
    res.send('destroy forum ' + req.troupe.title);
  },

  load: function(id, callback) { /** TODO: Add security */
    troupeService.findById(id, callback);
  }

};
