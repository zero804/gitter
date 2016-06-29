"use strict";

var roomContextService = require('../../services/room-context-service');
var normalizeRedirect = require('./normalise-redirect');
var debug = require('debug')('gitter:app:uri-context-resolver-middleware');
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

function uriContextResolverMiddleware(req, res, next) {
  var uri = normaliseUrl(req.params);
  debug("Looking up normalised uri %s", uri);

  return roomContextService.findContextForUri(req.user, uri)
    .then(function(uriContext) {
      req.troupe = uriContext.troupe;
      req.group = uriContext.group;
      req.uriContext = uriContext;
    })
    .catch(StatusError, function(e) {
      switch(e.status) {
        case 301:
          // TODO: check this works for userhome....
          if (e.path) {
            res.redirect(normalizeRedirect(e.path, req));
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
}

module.exports = uriContextResolverMiddleware;
