/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

module.exports = {
  install: function(app, apiRoot, authMiddleware) {
    // android devices with google cloud messaging
    app.post('/gcm', authMiddleware, require('./gcm'));
  }
};
