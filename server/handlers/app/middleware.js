/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var roomService = require('../../services/room-service');
var isPhone     = require('../../web/is-phone');
var url         = require('url');
var debug       = require('debug')('gitter:app-middleware');

function normaliseUrl(params) {
  if(params.roomPart3) {
    return params.roomPart1 + '/' + params.roomPart2 + '/' + params.roomPart3;
  }

  if(params.roomPart2) {
    return params.roomPart1 + '/' + params.roomPart2;
  }

  return params.roomPart1;
}

function getRedirectUrl(roomUrl, req) {
  // Figure out what the subframe is and add it to the URL, along with the original querystring
  var m = req.path.match(/\/~\w+$/);
  var frame = m && m[0] || "";
  var finalUrl = url.format({ pathname: roomUrl + frame, query: req.query });
  return finalUrl;
}

function uriContextResolverMiddleware(options) {

  return function(req, res, next) {
    var uri = normaliseUrl(req.params);
    var tracking = { source: req.query.source };

    debug("Looking up normalised uri %s", uri);

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

        var isValid = uriContext && (uriContext.troupe || uriContext.ownUrl);
        var accessToOrgRoomDenied = uriContext && uriContext.accessDenied && uriContext.accessDenied.githubType === 'ORG';

        if (!isValid && !accessToOrgRoomDenied) {
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
          return res.relativeRedirect(getRedirectUrl(err.redirect, req));
        }

        throw err;
      })
      .fail(next);
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
