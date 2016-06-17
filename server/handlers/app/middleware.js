"use strict";

var roomContextService = require('../../services/room-context-service');
var isPhone = require('../../web/is-phone');
var url = require('url');
var debug = require('debug')('gitter:app:app-middleware');
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
  return encodeURI(finalUrl);
}

function uriContextResolverMiddleware(options) {

  return function(req, res, next) {
    var uri = normaliseUrl(req.params);
    debug("Looking up normalised uri %s", uri);

    return roomContextService.findContextForUri(req.user, uri, options)
      .then(function(uriContext) {
        req.troupe = uriContext.troupe;
        req.group = uriContext.group;
        req.uriContext = uriContext;
        return null; // Stop bluebird from moaning about promises
      })
      .catch(StatusError, function(e) {
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
      .asCallback(next);
  };
}

function isPhoneMiddleware(req, res, next) {
  req.isPhone = isPhone(req);
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
  testOnly: {
    getRedirectUrl: getRedirectUrl
  }
};
