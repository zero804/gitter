/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var oauthService    = require('../../services/oauth-service');
var restSerializer  = require("../../serializers/rest-serializer");

module.exports =  function(req, res, next) {
  var strategy = new restSerializer.UserStrategy();

  restSerializer.serialize(req.user, strategy, function(err, serialized) {
    if(err) return next(err);

    oauthService.findOrGenerateIRCToken(req.user.id, function(err, token) {
      res.send({token: token, user: serialized});
    });
  });


};

