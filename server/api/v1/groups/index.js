"use strict";

var restful = require("../../../services/restful");
var StatusError = require('statuserror');

module.exports = {
  id: 'troupeId',
  index: function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    return restful.serializeGroupsForUser(req.user._id);
  },

  load: function(/*req, id*/) {
    return null;
  },

};
