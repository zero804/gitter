/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var appEvents           = require('../app-events');
var persistenceService  = require('../services/persistence-service');

// This listeners keeps a set of users per org so we can bill them properly.
// Receives events from the permission-model.

exports.install = function() {
  appEvents.localOnly.onTrackOrgMembership(function(data) {
    return persistenceService.Org.findOneAndUpdateQ(
      { uri: data.uri },
      { $addToSet: { members: data.userId }},
      { upsert: true });
  });
};
