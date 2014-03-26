/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var middleware = require('../../web/middleware');

module.exports = {
  install: function(app) {
    var auth = [
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn()
    ];

    app.get('/api/private/health_check',
        require('./health-check.js'));

    app.get('/api/private/user_email',
        require('./user-email'));

    app.get('/api/private/gh/repos/*',
        require('./github-mirror/repos-mirror'));

    app.get('/api/private/gh/users/*',
        require('./github-mirror/users-mirror'));

    app.get('/api/private/gh/user/repos',
        require('./github-mirror/user-repos-mirror'));

    app.get('/api/private/gh/search/users',
        require('./github-mirror/user-search-mirror'));

    // No auth for hooks yet
    app.post('/api/private/hook/:hash',
        require('./hooks'));

    app.get('/api/private/irc-token',
        auth,
        require('./irc-token.js'));

    app.get('/api/private/issue-state',
        auth,
        require('./issue-state.js'));

    app.get('/api/private/validate-token',
        require('./validate-token.js'));

    app.get('/api/private/room-permission',
        auth,
        require('./room-permission.js'));

    app.get('/api/private/generate-signature',
        auth,
        require('./transloadit-signature.js'));

    app.post('/api/private/transloadit/:token',
        require('./transloadit.js'));

  }
};
