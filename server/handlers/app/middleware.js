/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var roomService = require('../../services/room-service');
var isPhone     = require('../../web/is-phone');

function uriContextResolverMiddleware(req, res, next) {
  var uri;
  if(req.params.repo) {
    uri = req.params.userOrOrg + '/' + req.params.repo;
  } else {
    uri = req.params.userOrOrg;
  }

  return roomService.findOrCreateRoom(req.user, uri)
    .then(function(uriContext) {
      if(!uriContext.troupe) throw 404;
      req.troupe = uriContext.troupe;
      req.uriContext = uriContext;
      next();
    })
    .fail(next);
}

function isPhoneMiddleware(req, res, next) {
  req.isPhone = isPhone(req.headers['user-agent']);
  next();
}

function unauthenticatedPhoneRedirectMiddleware(req, res, next) {
  if(req.isPhone && !req.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

module.exports = exports = {
  uriContextResolverMiddleware: uriContextResolverMiddleware,
  unauthenticatedPhoneRedirectMiddleware: unauthenticatedPhoneRedirectMiddleware,
  isPhoneMiddleware: isPhoneMiddleware
};
