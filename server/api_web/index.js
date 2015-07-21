/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

module.exports = {
  install: function(app, authMiddleware) {
    require('./private').install(app, authMiddleware);
  }
};
