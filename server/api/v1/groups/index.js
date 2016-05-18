"use strict";

var restful = require("../../../services/restful");
var StatusError = require('statuserror');

module.exports = {
  id: 'troupeId',

  index: function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    return restful.serializeGroupsForUserId(req.user._id);
  },

  create: function(req) {
    /* console.log('AUTHINFO', req.authInfo); */
  },

  load: function(/*req, id*/) {
    return null;
  },

};
