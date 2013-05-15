/* jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  'components/realtime',
  'collections/troupes',
  'collections/files',
  'collections/conversations',
  'collections/users',
  'collections/chat',
  'collections/requests',
  'components/webNotifications',
  'components/unread-items-client',
  'log!collections/desktop',
  'filtered-collection' /* no ref */
], function($, _, Backbone, realtime, troupeModels, fileModels, conversationModels, userModels, chatModels, requestModels, webNotifications, unreadItemsClient, log) {
  "use strict";

  var chatCollection, fileCollection, requestCollection, conversationCollection, troupeCollection, filteredTroupeCollection,
  unreadTroupeCollection, peopleOnlyTroupeCollection, favouriteTroupesCollection, recentTroupeCollection, userCollection;


  function instantiate () {
    chatCollection = new chatModels.ChatCollection();
    instantiateCollection(chatCollection, 'chatMessages');

    requestCollection = new requestModels.RequestCollection();
    requestCollection.listen();
    requestCollection.fetch();

    // File Collections
    fileCollection = new fileModels.FileCollection();
    instantiateCollection(fileCollection, 'files');

    // Conversation Collections

    conversationCollection = new conversationModels.ConversationCollection();
    instantiateCollection(conversationCollection, 'conversations');

    // Troupe Collections
    troupeCollection = new troupeModels.TroupeCollection();
    instantiateCollection(troupeCollection, 'troupes');

    troupeCollection.on("remove", function(model) {
      if(model.id == window.troupeContext.troupe.id) {
        // TODO: tell the person that they've been kicked out of the troupe
        window.location.reload();
      }
    });
    unreadItemsClient.installTroupeListener(troupeCollection);

    // collection of normal troupes only
    filteredTroupeCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    filteredTroupeCollection.setFilter(function(m) {
      return !m.get('oneToOne') /* || m.get('unreadItems') > 0 */;
    });

    // collection of one to one troupes only
    peopleOnlyTroupeCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    peopleOnlyTroupeCollection.setFilter(function(m) {
      return m.get('oneToOne');
    });

    // collection of unread troupes only
    unreadTroupeCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    unreadTroupeCollection.setFilter(function(m) {
      return m.get('unreadItems') > 0;
    });

    // collection of favourited troupes
    favouriteTroupesCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    favouriteTroupesCollection.setFilter(function(m) {
      return m.get('favourite');
    });

    // collection of recent troupes only, will be empty at first.
    // doesn't need to be connected to events from the main collection,
    // because this only changes when the page is refreshed
    // (TODO actually it changes when another window accesses it as well, but this change doesn't get pushed through faye yet)
    recentTroupeCollection = new Backbone.Collection();

    // when the list of troupes come in filter them and put them in recentTroupeCollection
    troupeCollection.on('reset', function() {
      // filter out troupes that don't have a last access time
      var recentTroupeModels = _.filter(troupeCollection.models, function(v) {
        return !!v.get('lastAccessTime');
      });

      // sort the troupes by last accessed
      recentTroupeModels = _.sortBy(recentTroupeModels, function(v) {
        var lastAccess = v.get('lastAccessTime');

        return lastAccess.valueOf();
      }).reverse();

      // filter to the most recent 5
      recentTroupeModels = _.filter(recentTroupeModels, function(v, k) {
        return k < 5;
      });

      // set these as the models for recentTroupeCollection and send out a reset on that collection
      recentTroupeCollection.reset(recentTroupeModels);
    });

    // User Collections
    userCollection = new userModels.UserCollection();
    instantiateCollection(userCollection, 'users');

    function instantiateCollection(collection/*, name*/) {
      collection.listen();
      /*if(window.troupePreloads && window.troupePreloads[name]) {
        collection.reset(window.troupePreloads[name], { parse: true });
      } else {

        if(preloadedFetch) {
          $(document).one('preloadComplete', function() {
            collection.reset(window.troupePreloads[name], { parse: true });
          });

        } else {
          collection.fetch();

        }
      }*/
    }


  }

  function helpers() {
    // update online status of user models
    $(document).on('userLoggedIntoTroupe', updateUserStatus);
    $(document).on('userLoggedOutOfTroupe', updateUserStatus);

    function updateUserStatus(e, data) {
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

  var preloadStarted = false;
  var listenerInstalled = false;
  var initialConnectionEstablished = false;
  function fetchData() {
    if(preloadStarted) return;
    preloadStarted = true;
    log('Reloading data');

    $.ajax({
      url: window.location.pathname + '/preload?d=' + Date.now(),
      dataType: "json",
      type: "GET",
      success: function(data) {
        log('Preload completed, resetting collections');
        preloadStarted = false;

        fileCollection.reset(data['files'], { parse: true });
        chatCollection.reset(data['chatMessages'], { parse: true });
        conversationCollection.reset(data['conversations'], { parse: true });
        troupeCollection.reset(data['troupes'], { parse: true });
        userCollection.reset(data['users'], { parse: true });
        unreadItemsClient.preload(data['unreadItems']);

        if(!listenerInstalled) {
          listenerInstalled = true;
          $(document).on('realtime:newConnectionEstablished', function() {
            if(!initialConnectionEstablished) return;
            initialConnectionEstablished = true;
            fetchData();
          });
        }
      }
    });

    // Currently we don't have requests in the preloaded collection.
    requestCollection.fetch();
  }

  instantiate();
  fetchData();
  helpers();

  return {
    chats: chatCollection,
    requests: requestCollection,
    files: fileCollection,
    conversations: conversationCollection,
    troupes: troupeCollection,
    users: userCollection,
    peopleTroupes: peopleOnlyTroupeCollection,
    normalTroupes: filteredTroupeCollection,
    recentTroupes: recentTroupeCollection,
    unreadTroupes: unreadTroupeCollection,
    favouriteTroupes: favouriteTroupesCollection
  };

});