/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer = require("../../serializers/rest-serializer");

module.exports = {
    index: function(req, res, next) {
      var strategy = new restSerializer.UserIdStrategy({});

      restSerializer.serialize(req.chatMessage.readBy, strategy, function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });

    }

};
