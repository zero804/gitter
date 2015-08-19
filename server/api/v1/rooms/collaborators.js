/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var getCollaboratorForRoom = require('../../../services/collaborators-service');

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req, res, next) {
    return getCollaboratorForRoom(req.troupe, req.user)
      .then(function(collaborators) {
        return res.send(collaborators);
      })
      .catch(next);
  }

};
