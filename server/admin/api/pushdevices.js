/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userSearchService = require('../../services/user-search-service');
var pushNotificationService = require('../../services/push-notification-service');
var collections = require('../../utils/collections');

module.exports = {
  index: function(req, res, next) {
    userSearchService.globalUserSearch(req.query.q, { skip: req.query.skip, limit: req.query.limit})
      .then(function(searchResults) {
        var userSearchResults = searchResults.results;
        var userIds = userSearchResults.map(function(s) { return s.id; });

        return pushNotificationService.findDevicesForUsers(userIds)
          .then(function(devices) {
            var users = collections.indexById(userSearchResults);

            var serialized = devices.map(function(device) {
              var user = users[device.userId];
              return {
                deviceId: device.deviceId,
                timestamp: device.timestamp,
                appBuild: device.appBuild,
                appVersion: device.appVersion,
                deviceName: device.deviceName,
                deviceType: device.deviceType,
                userId: user.id,
                displayName: user.displayName,
                gravatarImageUrl: user.gravatarImageUrl,
                username: user.username
              };
            });

            res.send(serialized);
          });



      })
      .fail(next);
  }

};