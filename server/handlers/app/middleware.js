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

  if(req.params.channel) {
    uri = uri + '/*' + req.params.channel;
  }
  console.log('URI IS ', uri);
  return roomService.findOrCreateRoom(req.user, uri)
    .then(function(uriContext) {
      if(!uriContext.troupe && !uriContext.ownUrl) throw 404;

      var events = req.session.events;
      if(!events) {
        events = [];
        req.session.events = events;
      }

      if(uriContext.hookCreationFailedDueToMissingScope) {
        events.push('hooks_require_additional_public_scope');
      }

      if(uriContext.didCreate) {
        events.push('room_created_now');
      }

      req.troupe = uriContext.troupe;
      req.uriContext = uriContext;
      next();
    })
    .fail(function(err) {
      if(err && err.redirect) {
        return res.relativeRedirect(err.redirect);
      }

      next(err);
    });
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
