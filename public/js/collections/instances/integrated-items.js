"use strict";
/* jshint unused:true, browser:true */
var userModels = require('../users');
var chatModels = require('../chat');
var eventModels = require('../events');
var appEvents = require('utils/appevents');
var context = require('utils/context');
var unreadItemsClient = require('components/unread-items-client');
require('components/realtime-troupe-listener');

module.exports = (function() {
  var chatCollection          = new chatModels.ChatCollection(null, { listen: true });
  var userCollection          = new userModels.UserCollection(null, { listen: true });
  var rosterCollection        = new userModels.RosterCollection(null, { users: userCollection, limit: 21 });
  var sortedUserCollection    = new userModels.SortedUserCollection(null, { users: userCollection});
  var eventCollection         = new eventModels.EventCollection(null,  { listen: true, snapshot: true });

  // update online status of user models
  appEvents.on('userLoggedIntoTroupe', updateUserStatus);
  appEvents.on('userLoggedOutOfTroupe', updateUserStatus);

  function updateUserStatus(data) {
    var user = userCollection.get(data.userId);
    if (user) {
      // the backbone models have not always come through before the presence events,
      // but they will come with an accurate online status so we can just ignore the presence event
      user.set('online', (data.status === 'in') ? true : false);
    }
  }

  // send out a change event to avatar widgets that are not necessarily connected to a model object.
  /*
  this stuff is no longer required?
  userCollection.on('change:username change:displayName change:avatarUrlSmall change:avatarUrlMedium', function(model) {
    // TODO: move this into appevents
    $(document).trigger("avatar:change", model.toJSON());
  });
  */

  // Keep the unread items up to date on the model
  // This allows the unread items client to mark model items as read
  if(context.isLoggedIn()) {
    unreadItemsClient.syncCollections({
      'chat': chatCollection
    });
  }

  var collections = {
    chats: chatCollection,
    users: userCollection,
    sortedUsers: sortedUserCollection,
    roster: rosterCollection,
    events: eventCollection
  };

  window._intergratedCollections = collections;

  return collections;
})();
