'use strict';

module.exports = function leftMenuDefaultSort(a, b) {
    var aMentions   = a.mentions;
    var bMentions   = b.mentions;
    if (aMentions) { return -1; }
    if (bMentions) { return 1; }

    var aUnread = !!a.unreadItems;
    var bUnread = !!b.unreadItems;

    if (aUnread) { return -1; }
    if (bUnread) { return 1;}

    var aLastAccess = a.lastAccessTime;
    var bLastAccess = b.lastAccessTime;

    if(!aLastAccess || !aLastAccess.valueOf) { return 1 }
    if(!bLastAccess || !bLastAccess.valueOf) { return -1 }

    return aLastAccess < bLastAccess ? 1 : -1;

};
