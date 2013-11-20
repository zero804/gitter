/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var uriService  = require('../../services/uri-service');
var isPhone     = require('../../web/is-phone');

function uriContextResolverMiddleware(req, res, next) {
  return uriService.findUriForUser(req.user, req.params.userOrOrg)
    .then(function(result) {
      if(result.notFound) throw 404;
      req.troupe = result.troupe;
      req.uriContext = result;
      next();
    })
    .fail(next);
}

// TODO preload invites?

function preloadOneToOneTroupeMiddleware(req, res, next) {
  uriService.findUriForUser("one-one/" + req.params.userId, req.user && req.user.id)
    .then(function(result) {
      if(result.notFound) return next(404);

      req.troupe = result.troupe;
      req.uriContext = result;

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
  isPhoneMiddleware: isPhoneMiddleware,
  preloadOneToOneTroupeMiddleware: preloadOneToOneTroupeMiddleware
};
