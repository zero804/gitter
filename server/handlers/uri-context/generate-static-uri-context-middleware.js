"use strict";

function generateStaticUriContextMiddleware(uri) {
  return function(req, res, next) {
    req.uriContext = {
      uri: uri
    };
    next();
  };
}

module.exports = generateStaticUriContextMiddleware;
