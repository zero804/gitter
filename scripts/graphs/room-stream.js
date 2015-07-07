/* jshint node:true, unused:true */
'use strict';

var persistence = require('../../server/services/persistence-service');
var es = require('event-stream');
var csv = require('fast-csv');

var ANTI_MONOPOLY_LOWER_THRESHOLD = 500;
var ANTI_MONOPOLY_UPPER_THRESHOLD = 3000;
var MIN_WEIGHT = 0.05;

/* Returns a number between 0 and 1 */
/* For everything belong 1000, returns 1, then gradually goes down to 0.25 */
function getWeightForUserCount(userCount) {
  if (userCount <= ANTI_MONOPOLY_LOWER_THRESHOLD) return 1;
  if (userCount > ANTI_MONOPOLY_UPPER_THRESHOLD) return MIN_WEIGHT;

  var p = userCount - ANTI_MONOPOLY_LOWER_THRESHOLD;
  var v = (ANTI_MONOPOLY_UPPER_THRESHOLD - ANTI_MONOPOLY_LOWER_THRESHOLD - p) / (ANTI_MONOPOLY_UPPER_THRESHOLD - ANTI_MONOPOLY_LOWER_THRESHOLD) * (1 - MIN_WEIGHT);
  return (v + MIN_WEIGHT).toFixed(2);
}

module.exports = function roomStream() {
  return persistence.Troupe
    .find({ oneToOne: { $ne: true }})
    .lean()
    .select('oneToOne githubType security uri userCount')
    .stream()
    .pipe(es.map(function (room, callback) {
      var weight = getWeightForUserCount(room.userCount);
      callback(null, {
        roomId: '' + room._id,
        security: room.security,
        weight: weight
      });
    }))
    .pipe(csv.createWriteStream({ headers: true }));
};
