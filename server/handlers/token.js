/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var userService = require("../services/user-service"),
passport = require('passport');

module.exports = {
    install: function(app) {
      app.get('/token',
        function(req, res, next) {
          console.log("............ token");
          if(!req.user) return res.send(401);
          userService.getUserToken(req.user.id, function(err, token) {
            if(err || !token) return next(err);

            res.send(token);
          });
        });
    }
};