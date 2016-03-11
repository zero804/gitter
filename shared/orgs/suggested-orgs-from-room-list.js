'use strict';

var _                 = require('lodash');
var getRoomAvatar     = require('../avatars/get-room-avatar');
var getOrgNameFromUri = require('../get-org-name-from-uri');

module.exports = function suggestedOrgsFromRoomList(roomList, uri) {
  var orgList = roomList.reduce(function(memo, room) {
    //remove on-to-one conversations
    if (room.githubType === 'ONETOONE') { return memo; }

    //clean the prepending / from the url
    room.url = (room.url || '');
    var url  = room.url.substring(1);

    //get the first part of the url ie gitterHQ/gitter === gitterHQ
    var orgName = url.split('/')[0];

    //check its unique
    var existingEntry = _.where(memo, { name: orgName })[0];
    if (!!existingEntry) {
      var index = memo.indexOf(existingEntry);
      memo[index].unreadItems = ((existingEntry.unreadItems || 0) + (room.unreadItems || 0));
      memo[index].mentions    = ((existingEntry.mentions || 0) + (room.mentions || 0));
      memo[index].activity    = (!!memo[index].activity || (room.lurk && room.activity));
      return memo;
    }

    memo.push(getOrgItem(orgName, room));
    return memo;
  }, []);

  //If we are viewing a room owned by an org which the user is not yet a memeber of
  //we shunt the new org to the top of the minibar list JP 8/3/16
  var currentOrg = getOrgNameFromUri(uri);

  //This is pretty dodge tbh. JP 7/3/16
  //If a user is viewing gitterHQ/gitter or gitterHQ and have never joined a gitterHQ room
  //we want to show the gitterHQ org in the minibar
  //which is fine, but we only have the url to discern whether this is the case
  //this throws up issues for the home page and any other url with is not a room url
  //eg /home || /explore In the future if we add anymore /:pageName urls this will need to be changed :(
  if(currentOrg === 'home' || currentOrg === 'explore') {
    return orgList;
  }

  var hasCurrentOrg = _.findWhere(orgList, { name: currentOrg });
  //If we are sure that you are viewing an room for an org you have yet to join then
  //we add a temporary org to your org list
  if (!hasCurrentOrg) { orgList.unshift(getOrgItem(currentOrg, null, true)); }

  return orgList;
};

function getOrgItem(name, room, isViewingTemporaryOrg) {

  room                  = (room || {});
  isViewingTemporaryOrg = (isViewingTemporaryOrg || false);

  return {
    name:        name,
    imgUrl:      getRoomAvatar(name),
    id:          name,
    unreadItems: (room.unreadItems || 0),
    mentions:    (room.mentions || 0),
    activity:    (!!room.lurk && room.activity),
    //we add a temp variable here to specify a user is viewing a room
    //that belongs to an org they are not yey a member of
    temp:        isViewingTemporaryOrg,
  };
}
