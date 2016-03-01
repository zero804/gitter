"use strict";

// var roomService = require('../../services/room-service');
var roomContextService = require('../../services/room-context-service');
var isPhone     = require('../../web/is-phone');
var url         = require('url');
var debug       = require('debug')('gitter:app-middleware');
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
    // var tracking = { source: req.query.source };

    debug("Looking up normalised uri %s", uri);

    // var creationFilter = {
    //   all: false
    // };
    //
    // if(options && options.create) {
    //   creationFilter.all = true;
    //   if(options.create === 'not-repos') {
    //     creationFilter.REPO = false;
    //   }
    // }
    return roomContextService.findContextForUri(req.user, uri, options)
      .then(function(uriContext) {
        req.troupe = uriContext.troupe;

        req.uriContext = uriContext;
        next();
        return null;
      })
      .catch(function(e) {
        if (!(e instanceof StatusError)) throw e;
        switch(e.status) {
          case 301:
            // TODO: check this works for userhome....
            if (e.path) {
              res.redirect(getRedirectUrl(e.path, req));
              return null;
            }
            throw new StatusError(500, 'Invalid redirect');

          case 404:
            if (e.githubType === 'ORG' && e.uri) {
              var url = '/orgs/' + e.uri + '/rooms';
              //test if we are trying to load the org page in the chat frame.
              //fixes: https://github.com/troupe/gitter-webapp/issues/628
              if(/~chat$/.test(req.route.path)){
                url = url += '/~iframe';
              }
              res.redirect(url);
              return null;
            }
        }
        throw e;
      })
      .catch(next);

    // This becomes
    // roomService.findRoomContext(req.user, uri)
    // return roomService.findOrCreateRoom(req.user, uri, { tracking: tracking, creationFilter: creationFilter })
    //   .then(function(uriContext) {
    //
    //     var isValid = uriContext && (uriContext.troupe || uriContext.ownUrl);
    //     var accessToOrgRoomDenied = uriContext && uriContext.accessDenied && uriContext.accessDenied.githubType === 'ORG';
    //
    //     if (!isValid && !accessToOrgRoomDenied) {
    //       if(!req.user) {
    //         throw 401;
    //       }
    //
    //       throw 404;
    //     }
    //
    //     var events = req.session.events;
    //     if(!events) {
    //       events = [];
    //       req.session.events = events;
    //     }
    //
    //     if(uriContext.hookCreationFailedDueToMissingScope) {
    //       events.push('hooks_require_additional_public_scope');
    //     }
    //
    //     req.troupe = uriContext.troupe;
    //     req.uriContext = uriContext;
    //     next();
    //   })
    //   .catch(function(err) {
    //     if(err && err.redirect) {
    //       return res.relativeRedirect(getRedirectUrl(err.redirect, req));
    //     }
    //
    //     throw err;
    //   })
    //   .catch(next);
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
