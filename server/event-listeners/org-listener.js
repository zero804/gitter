/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var appEvents   = require('../app-events');
var persistenceService = require('../services/persistence-service');

exports.install = function() {
  appEvents.localOnly.onTrackOrgMembership(function(data) {
    console.log('TRACKING');

    return persistenceService.Org.findOneAndUpdateQ(
      { uri: data.uri },
      {
        $addToSet: {
          members: data.userId
        }
      },
      {
        upsert: true
      });
  });
};
