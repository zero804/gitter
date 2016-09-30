'use strict';

var reactionHashTransformer = require('gitter-web-topic-reactions/lib/reaction-hash-transformer');
var NO_REACTIONS = Object.freeze({});

function mapReactionCounts(objectWithReactionCounts) {
  if (!objectWithReactionCounts || !objectWithReactionCounts.reactionCounts) {
    return NO_REACTIONS;
  }

  return reactionHashTransformer(objectWithReactionCounts.reactionCounts);
}


module.exports = mapReactionCounts;
