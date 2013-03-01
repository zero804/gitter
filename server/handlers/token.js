/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var userService = require("../services/user-service");

//TODO: remove
module.exports = {
    install: function(app) {
      app.get('/token',
        function(req, res, next) {
          if(!req.user) return res.send(401);
          userService.getUserToken(req.user.id, function(err, token) {
            if(err || !token) return next(err);

            res.send(token);
          });
        });
    }
};