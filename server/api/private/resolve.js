'use strict';

var roomContextService = require('../../services/room-context-service');
var StatusError = require('statuserror');
var uriContextAsBrowserState = require('gitter-web-uri-resolver/lib/uri-context-as-browser-state');

function resolve(req, res, next) {
  var uri = req.params[0];

  return roomContextService.findContextForUri(req.user, uri, { ignoreCase: true })
    .bind({
      uriContext: null
    })
    .then(function(uriContext) {
      if (!uriContext) {
        throw new StatusError(404);
      }

      this.uriContext = uriContext;

      if (uriContext.ownUrl) {
        return true;
      }

      return uriContext.policy.canRead();
    })
    .then(function(access) {
      if (!access) throw new StatusError(404);

      res.set('Cache-Control', 'max-age=3600');
      var browserState = uriContextAsBrowserState(this.uriContext);

      if (!browserState) throw new StatusError(404);

      res.send(browserState);
    })
    .catch(next);
}

module.exports = resolve;
