"use strict";

var restful = require("../../../services/restful");
var StatusError = require('statuserror');
var groupService = require('gitter-web-groups/lib/group-service');
var restSerializer = require('../../../serializers/rest-serializer');

module.exports = {
  id: 'group',

  index: function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    return restful.serializeGroupsForUserId(req.user._id);
  },

  create: function(req) {
    var user = req.user;

    if (!req.user) {
      throw new StatusError(401);
    }

    if (!req.authInfo || !req.authInfo.clientKey === 'web-internal') {
      throw new StatusError(403, 'This is a private API');
    }

    var uri = String(req.body.uri);
    var name = String(req.body.name);
    return groupService.createGroup(user, { uri: uri, name: name });
  },

  show: function(req) {
    var group = req.params.group;
    var user = req.user;
    var userId = user && user._id;

    var strategy = new restSerializer.GroupStrategy({ currentUserId: userId, currentUser: user });
    return restSerializer.serializeObject(group, strategy);
  },

  put: function(req) {
    var group = req.params.group;
    var user = req.user;
    var userId = user && user._id;
  },

  load: function(req, id) {
    // TODO: security
    return groupService.findById(id);
  },

};
