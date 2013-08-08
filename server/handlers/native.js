/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var oauthService = require("../services/oauth-service");
var middleware = require('../web/middleware');

function serveNativeApp(page) {
  return [
    middleware.grantAccessForRememberMeTokenMiddleware,
    middleware.ensureLoggedIn(),
    function(req, res) {
      // TODO: pass forward the existing Bearer token if it exists
      oauthService.findOrGenerateWebToken(req.user.id)
        .then(function(accessToken) {
          res.render('mobile/' + page + '.hbs', {
            troupeContext: {
              userId: req.user.id
            },
            accessToken: accessToken
          });
        });
    }];

}
module.exports = {
    install: function(app) {

      app.get('/mobile/chat',
        serveNativeApp('native-chat-app'));

      app.get('/mobile/files',
        serveNativeApp('native-files-app'));

      app.get('/mobile/mails',
        serveNativeApp('native-mail-app'));

      app.get('/mobile/people',
        serveNativeApp('native-people-app'));

    }
};
