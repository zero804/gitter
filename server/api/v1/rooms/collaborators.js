"use strict";

var getCollaboratorForRoom = require('../../../services/collaborators-service');
var loadTroupeFromParam = require('./load-troupe-param');

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        // Why does this not use a serializer?
        return getCollaboratorForRoom(troupe, req.user);
      });
  }

};
