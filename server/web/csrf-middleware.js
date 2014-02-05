/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var oauthService = require('../services/oauth-service');

module.exports = function(req, res, next){
  var clientToken = getClientToken(req);
  
  oauthService.findOrGenerateWebToken(req.user.id)
    .then(function(serverToken) {

    // ignore these methods
    if ('GET' == req.method || 'HEAD' == req.method || 'OPTIONS' == req.method) return next();

    if(!clientToken || clientToken !== serverToken) {
      return next(403);
    }

    return next();
  });
};

function getClientToken(req) {
  return (req.body && req.body.accessToken) ||
         (req.query && req.query.accessToken) ||
         (req.headers['x-access-token']) ||
         (req.headers['x-csrf-token']) ||
         (req.headers['x-xsrf-token']);
}
