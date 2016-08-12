"use strict";

var roomContextService = require('../../services/room-context-service');
var debug = require('debug')('gitter:app:uri-context-resolver-middleware');

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
    .asCallback(next);
}

module.exports = uriContextResolverMiddleware;
