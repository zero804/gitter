/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var uriService = require('../services/uri-service');

module.exports = function(req, res, next) {
  var appUri = req.params.appUri;

  uriService.findUriForUser(appUri, req.user && req.user.id)
    .then(function(result) {
      if(result.notFound) return next(404);

      req.troupe = result.troupe;
      req.uriContext = result;

      next();
    })
    .fail(next);
};
