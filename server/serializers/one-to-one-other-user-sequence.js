'use strict';

var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

/**
 * Given the currentUser and a sequence of troupes
 * returns the 'other' userId for all one to one rooms
 */
function oneToOneOtherUserSequence(currentUserId, troupes) {
  return troupes.filter(function(troupe) {
      return troupe.oneToOne;
    })
    .map(function(troupe) {
      var a = troupe.oneToOneUsers[0] && troupe.oneToOneUsers[0].userId;
      var b = troupe.oneToOneUsers[1] && troupe.oneToOneUsers[1].userId;

      if (mongoUtils.objectIDsEqual(currentUserId, a)) {
        return b;
      } else {
        return a;
      }
    });
}

module.exports = oneToOneOtherUserSequence;
