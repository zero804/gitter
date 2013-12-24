/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var roomService    = require("../../services/room-service");
var restSerializer = require("../../serializers/rest-serializer");

function serialize(items, req, res, next) {

  var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

  restSerializer.serialize(items, strategy, function(err, serialized) {
    if(err) return next(err);

    res.send(serialized);
  });

}

module.exports = {
    index: function(req, res, next){
      roomService.findAllChannelsForRoom(req.troupe, function(err, channelTroupes) {
        if(err) return next(err);

        serialize(channelTroupes, req, res, next);
      });
    },

    "new": function(req, res){
      res.send(500);
    },

    create: function(req, res, next) {
      var body = req.body;
      return roomService.createChannelForRoom(req.troupe, req.user, body.name)
        .then(function(channelRoom) {
          return serialize(channelRoom, req, res, next);
        })
        .fail(next);
    },

    show: function(req, res, next) {
      return serialize(req.channel, req, res, next);
    },

    edit: function(req, res){
      res.send(500);
    },

    update:  function(req, res) {
      res.send(500);
    },

    destroy: function(req, res) {
      res.send(500);
    },

    load: function(req, id, callback){
      roomService.findChildChannelRoom(req.troupe, id, callback);
    }

};
