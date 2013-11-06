/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware      = require('../web/middleware');
var appMiddleware   = require('./app/middleware');

function redirectToNativeApp(page) {
  return function(req, res) {
    res.relativeRedirect('/mobile/' + page + '#' + req.troupe.id);
  };
}

var oneToOneMiddlewares = [
    middleware.grantAccessForRememberMeTokenMiddleware,
    middleware.ensureLoggedIn(),
    appMiddleware.preloadOneToOneTroupeMiddleware];

var uriMiddlewares = [
    middleware.grantAccessForRememberMeTokenMiddleware,
    middleware.ensureLoggedIn(),
    appMiddleware.uriContextResolverMiddleware];


module.exports = {
    install: function(app) {
      // Chat -----------------------
      app.get('/one-one/:userId/chat',
        oneToOneMiddlewares,
        redirectToNativeApp('chat'));

      app.get('/:appUri/chat',
        uriMiddlewares,
        redirectToNativeApp('chat'));

      // Files -----------------------
      app.get('/one-one/:userId/files',
        oneToOneMiddlewares,
        redirectToNativeApp('files'));

      app.get('/:appUri/files',
        uriMiddlewares,
        redirectToNativeApp('files'));

      app.get('/:appUri/mails',
        uriMiddlewares,
        redirectToNativeApp('mails'));

      app.get('/:appUri/people',
        uriMiddlewares,
        redirectToNativeApp('people'));

    }
};
