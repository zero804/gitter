"use strict";

var restful = require('../../../services/restful');
var StatusError = require('statuserror');

module.exports = {
  id: 'org',
  index: function(req) {
    if (!req.user) throw new StatusError(403);

    if (req.query.type === 'unused') {
      return restful.serializeUnusedOrgsForUser(req.user);
    }

    return restful.serializeOrgsForUser(req.user);
  }
};
