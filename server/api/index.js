/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";


module.exports = {
  install: function(app, apiRoot, authMiddleware) {
    require('./v1/').install(app, apiRoot, authMiddleware);
    require('./private/').install(app, apiRoot, authMiddleware);
    require('../resources/').install(app, apiRoot, authMiddleware);
  }
};