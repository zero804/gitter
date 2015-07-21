/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

module.exports = {
  install: function(app, authMiddleware) {

    app.get('/api_web/private/ping',
        authMiddleware,
        require('./ping.js'));

  }
};
