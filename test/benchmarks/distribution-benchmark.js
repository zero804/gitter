/* jshint node:true, unused:true */
'use strict';

var makeBenchmark = require('../make-benchmark');
var Distribution = require('../../server/services/unread-items/distribution');
var _ = require('lodash');

var PRESENCE_VALUES = ['inroom', 'online', 'mobile', 'push', 'push_connected', 'push_notified', 'push_notified_connected'];
var optionsMedium, resultsMedium;
var optionsLarge, resultsLarge;

function makeOptions(a,b,c,d) {
  return {
    notifyUserIds: _.range(a).map(function(x) { return String(x); }),
    mentionUserIds: _.range(b).map(function(x) { return String(x); }),
    notifyNoMention: _.range(b,a).map(function(x) { return String(x); }),
    notifyNewRoomUserIds: _.range(a + 1,a + c).map(function(x) { return String(x); }),
    activityOnlyUserIds: _.range(a + c, a + c + d).map(function(x) { return String(x); }),
    announcement: false,
    presence: _.range(a + c + d).reduce(function(memo, x) {
      memo[String(x)] = PRESENCE_VALUES[x % (PRESENCE_VALUES.length + 1)];
      return memo;
    }, {})
  };
}
function makeResults(a) {
  return _.range(a).reduce(function(memo, x) {
    memo[String(x)] = {
      badgeUpdate: x % 4 === 0,
      unreadCount: x % 11 === 0 ? undefined : x % 5,
      mentionCount: x % 3 === 0 ? undefined : x % 7,
    };
    return memo;
  }, {});
}

function runTestWith(options, results) {
  var distribution = new Distribution(options);
  var resultsDistribution = distribution.resultsProcessor(results);

  distribution.getNotifyNewRoom()
    .forEach(function() { });

  resultsDistribution.getNewUnreadWithoutMention()
    .forEach(function() {
    });

  resultsDistribution.getNewUnreadWithMention()
    .forEach(function() {
    });

  resultsDistribution.getTroupeUnreadCountsChange()
    .forEach(function() {
    });

  distribution.getWebNotifications()
    .toArray()
    .forEach(function() {
    });

  distribution.getPushCandidatesWithoutMention()
    .toArray()
    .forEach(function() {
    });

  distribution.getPushCandidatesWithMention()
    .toArray()
    .forEach(function() {
    });

  distribution.getConnectedActivityUserIds()
    .forEach(function() {
    });

  /* Do we need to send the user a badge update? */
  resultsDistribution.getBadgeUpdates()
    .toArray()
    .forEach(function() {
    });
}

makeBenchmark({
  maxTime: 3,
  before: function(done) {
    optionsMedium = makeOptions(100, 3, 2, 100);
    resultsMedium = makeResults(100);

    optionsLarge = makeOptions(1000, 3, 2, 20000);
    resultsLarge = makeResults(1000);

    done();
  },
  tests: {
    'mediumRoom': function() {
      runTestWith(optionsMedium, resultsMedium);
    },
    'largeRoom': function() {
      runTestWith(optionsLarge, resultsLarge);
    },

  }

});
