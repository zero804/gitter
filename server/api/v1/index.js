/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

module.exports = {
  install: function(app, apiRoot, authMiddleware) {
    var resourceApiRoot = apiRoot ? apiRoot.substring(1) + '/' : '';

    // APN has no auth requirement as user may not have authenticated
    // and this is used for devices without users
    app.post(apiRoot + '/v1/apn',
        require('./apn.js'));

    // userapn ties together devices from /v1/apn and actual users.
    // this definitely requires auth
    app.post(apiRoot + '/v1/userapn',
        authMiddleware,
        require('./userapn.js'));

    app.post(apiRoot + '/v1/eyeballs',
        authMiddleware,
        require('./eyeballs.js'));

    app.get(apiRoot + '/v1/ping',
        authMiddleware,
        require('./ping.js'));

    app.all(apiRoot + '/v1/sockets', authMiddleware);
    app.resource(resourceApiRoot + 'v1/sockets',
        require('./sockets.js'));

    app.get(apiRoot + '/v1/repo-info',
        authMiddleware,
        require('./repo-info.js'));

    app.get(apiRoot + '/v1/channel-search',
        authMiddleware,
        require('./channel-search.js'));

    // Deprecated - remove by 15 November
    app.get(apiRoot + '/v1/public-repo-search',
        authMiddleware,
        require('./public-repo-search.js'));

  }
};
