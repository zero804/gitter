/* jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  '../base',
  '../files',
  '../conversations',
  '../users',
  '../chat',
  '../requests',
  'utils/appevents',
  'components/unread-items-client',
  'components/realtime-troupe-listener'     // No reference
], function($, _, Backbone, base, fileModels, conversationModels, userModels, chatModels,
  requestModels, appEvents, unreadItemsClient) {
  "use strict";

  var requestCollection      = new requestModels.RequestCollection(null, { listen: true });
  var chatCollection         = new chatModels.ChatCollection(null, { listen: true });
  var fileCollection         = new fileModels.FileCollection(null, { listen: true });
  var conversationCollection = new conversationModels.ConversationCollection(null, { listen: true });
  var userCollection         = new userModels.UserCollection(null, { listen: true });

  function helpers() {

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
    userCollection.on('change', function(model) {
      $(document).trigger("avatar:change", model.toJSON());
    });

    // Keep the unread items up to date on the model
    // This allows the unread items client to mark model items as read
    unreadItemsClient.syncCollections({
      'chat': chatCollection,
      'request': requestCollection,
      'file': fileCollection
    });
  }

  helpers();

  return {
    chats: chatCollection,
    requests: requestCollection,
    files: fileCollection,
    conversations: conversationCollection,
    users: userCollection
  };

});