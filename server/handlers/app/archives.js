/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware      = require('../../web/middleware');


module.exports = {
  repo: {
    landing: [
      appMiddleware.uriContextResolverMiddleware,
      function(req, res, next) {
        res.send(req.troupe);
      }
    ]
  }
};