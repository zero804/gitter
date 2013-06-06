/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var presenceService = require('../../services/presence-service');
var restSerializer = require("../../serializers/rest-serializer");

// Only used here, no point in adding this to rest serializer
function SocketStrategy() {
  var userStrategy = new restSerializer.UserIdStrategy();
  var troupeStrategy = new restSerializer.TroupeIdStrategy();

  this.preload =  function(sockets, callback) {
        restSerializer.execPreloads([
          { strategy: userStrategy, data: sockets.map(function(s) { return s.userId; })},
          { strategy: troupeStrategy, data: sockets.map(function(s) { return s.troupeId; })}
        ], callback);
      };

  this.map =  function(socket) {
    return {
      user: userStrategy.map(socket.userId),
      troupe: troupeStrategy.map(socket.troupeId),
      eyeballs: socket.eyeballs,
      mobile: socket.mobile,
      createdTime: socket.createdTime
    };
  };

}

module.exports = function(req, res, next) {
  presenceService.listActiveSockets(function(err, sockets) {
    if(err) return next(err);

    var strategy = new SocketStrategy();

    restSerializer.serialize(sockets, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });

  });
};
