/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require('../../services/user-service');
var moment = require('moment');

module.exports = {
  create: function(req, res, next) {
    var timestamp = moment.utc(req.body.timestamp);

    userService.setUserLocation(req.user.id, {
      timestamp:  timestamp,
      lon: req.body.long,
      lat: req.body.lat,
      speed: req.body.speed,
      altitude: req.body.altitude
    }, function(err) {
      if(err) return next(err);
      res.send("{ sucess: true }");
    });

  },

  load: function(req, id, callback) {
    callback("Error");
  }

};