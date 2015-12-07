"use strict";

var StatusError = require('statuserror');
var restful = require("../../services/restful");

module.exports = function getUserProfile(req, res, next) {
  if (!req.params || !req.params.username) return next(new StatusError(404));

  return restful.serializeProfileForUsername(req.params.username)
    .then(function(response) {
      res.send(response);
    })
    .catch(next);

};
