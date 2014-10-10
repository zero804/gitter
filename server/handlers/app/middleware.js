/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var roomService = require('../../services/room-service');
var isPhone     = require('../../web/is-phone');
var StatusError = require('statuserror');

function normaliseUrl(params) {
  if(params.roomPart3) {
    return params.roomPart1 + '/' + params.roomPart2 + '/' + params.roomPart3;
  }

  if(params.roomPart2) {
    return params.roomPart1 + '/' + params.roomPart2;
  }

  return params.roomPart1;
}

function uriContextResolverMiddleware(options) {

  return function(req, res, next) {
    var uri = normaliseUrl(req.params);
    var tracking = { source: req.query.source };

    var creationFilter = {
      all: false
    };

    if(options && options.create) {
      creationFilter.all = true;
      if(options.create === 'not-repos') {
        creationFilter.REPO = false;
      }
    }

    return roomService.findOrCreateRoom(req.user, uri, { tracking: tracking, creationFilter: creationFilter })
      .then(function(uriContext) {

        if(!uriContext || (!uriContext.troupe && !uriContext.ownUrl)) {
          if(!req.user) {
            throw 401;
          }

          throw 404;
        }

        var events = req.session.events;
        if(!events) {
          events = [];
          req.session.events = events;
        }

        if(uriContext.hookCreationFailedDueToMissingScope) {
          events.push('hooks_require_additional_public_scope');
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
  };
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
