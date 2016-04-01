'use strict';

var _                  = require('lodash');
var Promise            = require('bluebird');
var createDistribution = require('./create-distribution');

function toString(f) {
  if (!f) return '';
  return '' + f;
}

/**
 * Given a set of original mentions and a chat message, returns
 * { addNotify: [userIds], addMentions: [userIds], remove: [userIds], addNewRoom: [userIds] }
 * Which consist of users no longer mentioned in a message and
 * new users who are now mentioned in the message, who were not
 * previously.
 */
function generateMentionDeltaSet(newNotifyUserIds, newMentionUserIds, originalMentions) {
  var newNotifyUserIdStrings = _.map(newNotifyUserIds, toString);
  var newMentionUserIdStrings = _.map(newMentionUserIds, toString);
  var originalMentionUserIdStrings = _.map(originalMentions, toString);

  var addMentions = _.without.apply(null, [newMentionUserIdStrings].concat(originalMentionUserIdStrings));
  var removeMentions = _.without.apply(null, [originalMentionUserIdStrings].concat(newMentionUserIdStrings));

  /*
   * List of users who should get unread items, who were previously mentioned
   * but no longer are
   */
  var forNotifyWithRemoveMentions = _.intersection(newNotifyUserIdStrings, removeMentions);

  /*
   * Everyone who was added via a mention, plus everyone who was no longer
   * mentioned but is not lurking
   */
  var addNotify = forNotifyWithRemoveMentions.concat(addMentions);

  return {
    addNotify: addNotify,
    addMentions: addMentions,
    remove: removeMentions
  };
}

function deltaDistributions(newDistribution, originalDistribution) {
  return Promise.join(
    newDistribution.getEngineNotifyList().toArray().toPromise(Promise),
    newDistribution.getEngineMentionList().toArray().toPromise(Promise),
    originalDistribution.getEngineMentionList().toArray().toPromise(Promise),
    generateMentionDeltaSet);
}

function createDelta(fromUserId, troupe, newMentions, originalMentions) {
  return Promise.join(
    createDistribution(fromUserId, troupe, newMentions),
    createDistribution(fromUserId, troupe, originalMentions, { delta: true }),
    function(newDistribution, originalDistribution) {
      return [deltaDistributions(newDistribution, originalDistribution), newDistribution];
    });
}


module.exports = createDelta;
