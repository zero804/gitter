'use strict';

var Observable = require('rx').Observable;

function connectedPredicate(presence) {
  return function(userId) {
    var status = presence[userId];

    return status && (status === 'inroom' ||
      status === 'online' ||
      status === 'mobile' ||
      status === 'push_connected' ||
      status === 'push_notified_connected');
  };
}

function Distribution(options) {
  this.notifyUserIds = options.notifyUserIds;
  this.mentionUserIds = options.mentionUserIds;
  this.notifyNewRoomUserIds = options.notifyNewRoomUserIds;
  
  this._notifyNoMention = Observable.from(options.notifyNoMention || []);
  this._notifyUserIds = Observable.from(options.notifyUserIds || []);
  this._mentionUserIds = Observable.from(options.mentionUserIds || []);
  this._activityOnlyUserIds = Observable.from(options.activityOnlyUserIds || []);
  this._notifyNewRoomUserIds = Observable.from(options.notifyNewRoomUserIds || []);

  this._announcement = options.announcement || false;
  this._presence = options.presence || {};
}

Distribution.prototype = {
  getNotifyNewRoom: function() {
    return this._notifyNewRoomUserIds;
  },

  getWebNotificationsWithoutMention: function() {
    var presenceStatus = this._presence;

    return this._notifyNoMention
      .filter(function(userId) {
        var status = presenceStatus[userId];

        return status === 'online';
      });
  },

  getWebNotificationsWithMention: function() {
    var presenceStatus = this._presence;

    return this._mentionUserIds
      .filter(function(userId) {
        var status = presenceStatus[userId];

        return status === 'online';
      });
  },

  getPushCandidatesWithoutMention: function() {
    var presenceStatus = this._presence;

    return this._notifyNoMention
      .filter(function(userId) {
        var status = presenceStatus[userId];

        return status && (status === 'push' || status === 'push_connected');
      });
  },

  getPushCandidatesWithMention: function() {
    var presenceStatus = this._presence;

    return this._mentionUserIds
      .filter(function(userId) {
        var status = presenceStatus[userId];

        return status && (status === 'push' ||
          status === 'push_connected' ||
          status === 'push_notified' ||
          status === 'push_notified_connected');
      });
  },

  /**
   * Returns a list of activity only users in this distribution
   * who are currently connected
   */
  getConnectedActivityUserIds: function() {
    return this._activityOnlyUserIds
      .filter(connectedPredicate(this._presence));
  },

  resultsProcessor: function(unreadItemResults) {
    return new DistributionResultsProcessor(this, unreadItemResults);
  },

};

function DistributionResultsProcessor(distribution, unreadItemResults) {
  this._distribution = distribution;
  this._unreadItemResults = unreadItemResults;
}

DistributionResultsProcessor.prototype = {
  getTroupeUnreadCountsChange: function() {
    var unreadItemResults = this._unreadItemResults;

    return this._distribution._notifyUserIds
      .filter(connectedPredicate(this._distribution._presence))
      .map(function(userId) {
        var result = unreadItemResults[userId];
        if (!result) return;

        var unreadCount = result.unreadCount;
        var mentionCount = result.mentionCount;

        if(unreadCount >= 0 || mentionCount >= 0) {
          return {
            userId: userId,
            total: unreadCount,
            mentions: mentionCount
          };
        }
      })
      .filter(function(f) {
        return !!f;
      });
  },

  getBadgeUpdates: function() {
    var unreadItemResults = this._unreadItemResults;
    var presenceStatus = this._distribution._presence;

    return this._distribution._notifyUserIds
      .filter(function(userId) {
        var userResult = unreadItemResults[userId];
        var onlineStatus = presenceStatus[userId];

        /* online status null implies the user has no push notification devices */
        return onlineStatus && userResult && userResult.badgeUpdate;
      });
  },

  getNewUnreadWithMention: function() {
    return this._distribution._mentionUserIds
      .filter(connectedPredicate(this._distribution._presence));
  },

  getNewUnreadWithoutMention: function() {
    return this._distribution._notifyNoMention
      .filter(connectedPredicate(this._distribution._presence));
  }
};


module.exports = Distribution;
