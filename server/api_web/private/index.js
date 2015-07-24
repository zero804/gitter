/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

module.exports = {
  install: function(app, authMiddleware) {

    app.get('/api_web/private/ping',
        authMiddleware,
        require('./ping'));

    app.get('/api_web/private/health_check',
        // No auth
        require('../../api/private/health-check'));

    app.get('/api_web/private/health_check/full',
        // No auth
        require('../../api/private/health-check-full'));

  }
};
