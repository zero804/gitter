/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var oauthService  = require("../services/oauth-service");
var middleware    = require('../web/middleware');
var nconf         = require('../utils/config');

var useAppCache   = nconf.get('web:useAppCache');

function serveNativeApp(page) {
  return [
    middleware.grantAccessForRememberMeTokenMiddleware,
    middleware.ensureLoggedIn(),
    function(req, res) {
      // TODO: pass forward the existing Bearer token if it exists
      oauthService.findOrGenerateWebToken(req.user.id)
        .then(function(accessToken) {
          res.render('mobile/native-' + page + '-app.hbs', {
            troupeContext: {
              userId: req.user.id
            },
            accessToken: accessToken,
            appCache: useAppCache && page + '.appcache'
          });
        });
    }];
}

module.exports = {
    install: function(app) {

      app.get('/mobile/chat',
        serveNativeApp('chat'));

      app.get('/mobile/files',
        serveNativeApp('files'));

      app.get('/mobile/mails',
        serveNativeApp('mail'));

      app.get('/mobile/people',
        serveNativeApp('people'));

      app.get('/mobile/accept',
        serveNativeApp('accept'));

    }
};
