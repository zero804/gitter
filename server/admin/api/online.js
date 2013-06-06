/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var presenceService = require('../../services/presence-service');
var restSerializer = require("../../serializers/rest-serializer");

module.exports = function(req, res, next) {
  presenceService.listOnlineUsers(function(err, userIds) {
    if(err) return next(err);

    var strategy = new restSerializer.UserIdStrategy();

    restSerializer.serialize(userIds, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });

  });
};
