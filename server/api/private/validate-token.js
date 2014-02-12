/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var oauthService = require('../../services/oauth-service');
var userService = require('../../services/user-service');

module.exports =  function(req, res, next) {

  var token = req.query.token;
  oauthService.validateToken(token, function(err, userId) {
    var valid = (err || !userId) ? false : true;
    if (valid) {
      userService.findById(userId).then(function(user) {
        res.send({token: token, valid: valid, user: user});
      });
    } else {
      res.send({token: token, valid: valid});
    }
  });

};

