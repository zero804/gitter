/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var oauthService = require('../../services/oauth-service');

module.exports =  function(req, res, next) {

  oauthService.findOrGenerateIRCToken(req.user.id, function(err, token) {
    res.send({token: token});
  });

};

