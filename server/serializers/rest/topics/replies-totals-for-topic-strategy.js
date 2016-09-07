"use strict";

var replyService = require('gitter-web-topics/lib/reply-service');

function RepliesTotalsForTopicStrategy(/*options*/) {
  this.repliesTotalMap = null;
}

RepliesTotalsForTopicStrategy.prototype = {
  preload: function(topicIds) {
    return replyService.findTotalsByTopicIds(topicIds.toArray())
      .bind(this)
      .then(function(repliesTotals) {
        this.repliesTotalMap = repliesTotals;
      });
  },

  map: function(topicId) {
    return this.repliesTotalMap[topicId];
  },

  name: 'RepliesTotalsForTopicStrategy'
};


module.exports = RepliesTotalsForTopicStrategy;
