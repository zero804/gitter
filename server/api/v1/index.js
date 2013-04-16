/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var middleware = require('../../web/middleware');

module.exports = {
  install: function(app) {
    var auth = [
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn()
    ];

    app.all('/api/v1/location', auth);
    app.resource('api/v1/location', require('./location.js'));

    /* APN has no auth requirement as user may not have authenticated */
    app.resource('api/v1/apn', require('./apn.js'));

    app.all('/api/v1/userapn', auth);
    app.resource('api/v1/userapn', require('./userapn.js'));

    app.all('/api/v1/eyeballs', auth);
    app.resource('api/v1/eyeballs', require('./eyeballs.js'));

  }
};