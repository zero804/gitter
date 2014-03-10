/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var middleware = require('../../web/middleware');

module.exports = {
  install: function(app) {
    var auth = [
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn()
    ];

    app.post('/api/v1/location',
        auth,
        require('./location.js'));

    /* APN has no auth requirement as user may not have authenticated */
    app.resource('api/v1/apn',
        require('./apn.js'));

    app.post('/api/v1/userapn',
        auth,
        require('./userapn.js'));

    app.post('/api/v1/eyeballs',
        auth,
        require('./eyeballs.js'));

    app.get('/api/v1/ping',
        auth,
        require('./ping.js'));

    app.all('/api/v1/sockets', auth);
    app.resource('api/v1/sockets',
        require('./sockets.js'));

    app.get('/api/v1/repo-info',
        auth,
        require('./repo-info.js'));

    app.get('/api/v1/public-repo-search',
        auth,
        require('./public-repo-search.js'));




  }
};
