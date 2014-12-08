/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

module.exports = {
  install: function (app, apiRoot, authMiddleware) {
    [
      './v1/',
      './private/',
      '../resources/'
    ].forEach(function (resource) {
      require(resource).install(app, apiRoot, authMiddleware);
    });
  }
};
