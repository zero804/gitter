/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var restSerializer = require("../../serializers/rest-serializer"),
    userService = require("../../services/user-service");

module.exports = {
  id: 'resourceUser',

  index: function(req, res, next) {
    if(!req.user) {
      return next(403);
    }

    var strategy = new restSerializer.UserStrategy();

    restSerializer.serialize(req.user, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send([ serialized ]);
    });

  },

  show: function(req, res, next) {
    var strategy = new restSerializer.UserStrategy();

    restSerializer.serialize(req.resourceUser, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  load: function(req, id, callback) {
    // TODO: SECURITY!
    if(!req.user) return callback(401);
    userService.findById(id, callback);
  }

};
