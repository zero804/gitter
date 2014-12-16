'use strict';
var ensurePojo = require('./ensure-pojo');

function natural(a, b) {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

function getRank(room) {
  // hasHadMentionsAtSomePoint (and the equivalent for unreadItems) is used
  // to ensure that rooms dont jump around when mentions is updated after a
  // user visits a room and reads all the mentions.
  // hasHadMentionsAtSomePoint is not available on the server, so we have a failover.
  if (room.hasHadMentionsAtSomePoint || room.mentions) {
    return 0;
  } else if (room.hasHadUnreadItemsAtSomePoint || room.unreadItems) {
    return 1;
  } else {
    return 2;
  }
}

function timeDifference(a, b) {
  // lastAccessTimeNoSync is used to ensure that rooms dont jump around when
  // lastAccessTime is updated after a user visits a room
  // lastAccessTimeNoSync is not available on the server, so we have a failover.
  var aDate = a.lastAccessTimeNoSync || a.lastAccessTime;
  var bDate = b.lastAccessTimeNoSync || b.lastAccessTime;

  if(!aDate && !bDate) {
    return 0;
  } else if(!aDate) {
    // therefore bDate exists and is best
    return 1;
  } else if(!bDate) {
    // therefore aDate exists and is best
    return -1;
  } else {
    return new Date(bDate).valueOf() - new Date(aDate).valueOf();
  }
}

// we want to sort in a descending order, thus the negative results
module.exports = {
  favourites: {
    sort: function (a, b) {
      a = ensurePojo(a);
      b = ensurePojo(b);
      var isDifferent = natural(a.favourite, b.favourite);

      if (isDifferent) return isDifferent; // -1 or 1

      // both favourites of the same rank, order by name
      return natural(a.name, b.name);
    },
    filter: function (room) {
      room = ensurePojo(room);
      return !!room.favourite;
    }
  },

  recents: {
    sort: function (a, b) {
      a = ensurePojo(a);
      b = ensurePojo(b);

      var aRank = getRank(a);
      var bRank = getRank(b);

      if (aRank === bRank) {
        return timeDifference(a, b, aRank);
      } else {
        return aRank - bRank;
      }
    },
    filter: function (room) {
      room = ensurePojo(room);
      return !room.favourite && !!(room.lastAccessTime || room.unreadItems || room.mentions);
    }
  }
};
