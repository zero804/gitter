"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')

function AggregatedUserNotificationStrategy() {
  this.userStrategy = new UserStrategy();
}

AggregatedUserNotificationStrategy.prototype = {
  preload: function() {
  },

  map: function(aggregatedNotification) {
    return {
    }
  },

  name: 'AggregatedUserNotificationStrategy',
};

module.exports = AggregatedUserNotificationStrategy;
