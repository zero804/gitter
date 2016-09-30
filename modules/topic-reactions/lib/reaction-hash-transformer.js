'use strict';

/**
 * Because we use $inc, the reactionCounts will sometimes have
 * zero values on them. This cleans that up.
 */
function reactionHashTransformer(reactionCounts) {
  if (!reactionCounts) return {};

  for(var k in reactionCounts) {
    var val = reactionCounts[k];
    if(val === 0 && reactionCounts.hasOwnProperty(k)) {
      delete reactionCounts[k];
    }
  }

  return reactionCounts;
}

module.exports = reactionHashTransformer;
