"use strict";

var userService = require("../../../services/user-service");
var restSerializer = require("../../../serializers/rest-serializer");
var StatusError = require('statuserror');

module.exports = {
  id: 'user',

  show: function(req) {
    var strategy = new restSerializer.UserProfileStrategy();
    return restSerializer.serialize(req.user, strategy);
  },

  load: function(req, username) {
    // TODO: what about github usernames that don't have gitter accounts?
    return userService.findByUsername(username);
  }
};
