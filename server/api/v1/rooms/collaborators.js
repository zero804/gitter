"use strict";

var getCollaboratorForRoom = require('../../../services/collaborators-service');
var paramLoaders           = require('./param-loaders');

module.exports = {
  id: 'resourceTroupeUser',

  index: [paramLoaders.troupeLoader, function(req, res, next) {
    return getCollaboratorForRoom(req.troupe, req.user)
      .then(function(collaborators) {
        return res.send(collaborators);
      })
      .catch(next);
  }]

};
