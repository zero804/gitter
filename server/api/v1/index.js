/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var middleware = require('../../web/middleware');
var expressValidator = require('express-validator');

module.exports = {
  install: function(app) {
    var auth = [
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn()
    ];

    app.resource('api/v1/location',
        auth,
        require('./location.js'));

    /* APN has no auth requirement as user may not have authenticated */
    app.resource('api/v1/apn',
        require('./apn.js'));

    app.resource('api/v1/userapn',
        auth,
        require('./userapn.js'));

    app.resource('api/v1/eyeballs',
        auth,
        require('./eyeballs.js'));

    app.get('/api/v1/ping',
        auth,
        require('./ping.js'));

    // No auth for username suggestions yet
    app.get('/api/v1/usernamesuggestions',
        require('./username-suggestions.js'));

    app.resource('api/v1/sockets',
        auth,
        require('./sockets.js'));

    app.post('/api/v1/inviteconnections',
        auth,
        require('./invite-connections.js'));

    app.post('/api/v1/requestaccessexisting',
        auth,
        expressValidator,
        require('./request-access-existing.js'));

    app.post('/api/v1/requestaccess',
        expressValidator,
        require('./request-access-new.js'));

  }
};