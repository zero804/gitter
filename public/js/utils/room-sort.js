'use strict';
var ensurePojo = require('./ensure-pojo');

function natural(a, b) {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

function getRank(room) {
  if (room.hasHadMentionsAtSomePoint || room.mentions) {
    return 0;
  } else if (room.hasHadUnreadItemsAtSomePoint || room.unreadItems) {
    return 1;
  } else {
    return 2;
  }
}

function timeDifference(a, b) {
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

// it is worth noticing that we want to sort in a descindencing order, thus the negative results
module.exports = {
  favourites: {
    sort: function (a, b) {
      a = ensurePojo(a);
      b = ensurePojo(b);
      var isDifferent = natural(a.favourite, b.favourite);

      // one of them isn't a favourite
      if (isDifferent) return isDifferent; // -1 or 1

      // both favourites, order by name
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
