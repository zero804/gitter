/*jshint unused:true, browser:true*/
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

  function instantiate () {
    var chatCollection = new chatModels.ChatCollection();
    instantiateCollection(chatCollection, 'chatMessages');

    var requestCollection = new requestModels.RequestCollection();
    requestCollection.listen();
    requestCollection.fetch();

    // File Collections
    var fileCollection = new fileModels.FileCollection();
    instantiateCollection(fileCollection, 'files');

    // Conversation Collections

    var conversationCollection = new conversationModels.ConversationCollection();
    instantiateCollection(conversationCollection, 'conversations');

    // Troupe Collections
    var troupeCollection = new troupeModels.TroupeCollection();
    instantiateCollection(troupeCollection, 'troupes');

    troupeCollection.on("remove", function(model) {
      if(model.id == window.troupeContext.troupe.id) {
        // TODO: tell the person that they've been kicked out of the troupe
        if(window.troupeContext.troupeIsDeleted) {
          window.location.href = '/last';
        } else {
          window.location.reload();
        }
      }
    });
    unreadItemsClient.installTroupeListener(troupeCollection);

    // collection of normal troupes only
    var filteredTroupeCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    filteredTroupeCollection.setFilter(function(m) {
      return !m.get('oneToOne') /* || m.get('unreadItems') > 0 */;
    });

    // collection of one to one troupes only
    var peopleOnlyTroupeCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    peopleOnlyTroupeCollection.setFilter(function(m) {
      return m.get('oneToOne');
    });

    // collection of unread troupes only
    var unreadTroupeCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    unreadTroupeCollection.setFilter(function(m) {
      return m.get('unreadItems') > 0;
    });

    // collection of favourited troupes
    var favouriteTroupesCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    favouriteTroupesCollection.setFilter(function(m) {
      return m.get('favourite');
    });

    // collection of recent troupes only, will be empty at first.
    // doesn't need to be connected to events from the main collection,
    // because this only changes when the page is refreshed
    // (TODO actually it changes when another window accesses it as well, but this change doesn't get pushed through faye yet)
    var recentTroupeCollection = new Backbone.Collection();

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
    var userCollection = new userModels.UserCollection();
    instantiateCollection(userCollection, 'users');

    exports['chats'] = chatCollection;
    exports['requests'] = requestCollection;
    exports['files'] = fileCollection;
    exports['conversations'] = conversationCollection;
    exports['troupes'] = troupeCollection;
    exports['users'] = userCollection;
    exports['peopleTroupes'] = peopleOnlyTroupeCollection;
    exports['normalTroupes'] = filteredTroupeCollection;
    exports['recentTroupes'] = recentTroupeCollection;
    exports['unreadTroupes'] = unreadTroupeCollection;
    exports['favouriteTroupes'] = favouriteTroupesCollection;

    function instantiateCollection(collection, name) {
      collection.listen();
      if(window.troupePreloads && window.troupePreloads[name]) {
        collection.reset(window.troupePreloads[name], { parse: true });
      } else {

        if(preloadedFetch) {
          $(document).one('preloadComplete', function() {
            collection.reset(window.troupePreloads[name], { parse: true });
          });

        } else {
          collection.fetch();

        }
      }
    }


  }

  function helpers() {
    // update online status of user models
    $(document).on('userLoggedIntoTroupe', updateUserStatus);
    $(document).on('userLoggedOutOfTroupe', updateUserStatus);

    function updateUserStatus(e, data) {
      var user = exports.users.get(data.userId);
      if (user) {
        // the backbone models have not always come through before the presence events,
        // but they will come with an accurate online status so we can just ignore the presence event
        user.set('online', (data.status === 'in') ? true : false);
      }
    }

    // send out a change event to avatar widgets that are not necessarily connected to a model object.
    exports.users.on('change', function(model) {
      $(document).trigger("avatar:change", model.toJSON());
    });

    // Keep the unread items up to date on the model
    unreadItemsClient.syncCollections({
      'chat': exports.chats,
      'request': exports.requests,
      'file': exports.files
    });
  }

  var preloadedFetch = false;
  function preload() {
    if(!window.troupePreloads) {
      preloadedFetch = true;
      $.ajax({
        url: window.location.pathname + '/preload',
        dataType: "json",
        type: "GET",
        success: function(data) {
          window.troupePreloads = data;

          $(document).trigger('preloadComplete', data);
        }
      });

    } else {
      preloadedFetch = false;
    }

    $(document).on('realtime:newConnectionEstablished', function() {
      log('Reloading data');
      $.ajax({
        url: window.location.pathname + '/preload',
        dataType: "json",
        type: "GET",
        success: function(data) {
          exports.requests.fetch();
          exports.files.reset(data['files'], { parse: true });
          exports.chats.reset(data['chatMessages'], { parse: true });
          exports.conversations.reset(data['conversations'], { parse: true });
          exports.troupes.reset(data['troupes'], { parse: true });
          exports.users.reset(data['users'], { parse: true });
          unreadItemsClient.preload(data['unreadItems']);
        }
      });
    });

    window.troupePreloads = {};

    if(window.troupePreloads && window.troupePreloads.unreadItems) {
      unreadItemsClient.preload(window.troupePreloads.unreadItems);
    } else {
      $(document).one('preloadComplete', function() {
        unreadItemsClient.preload(window.troupePreloads.unreadItems);
      });
    }
  }

  var exports = {};
  preload();
  instantiate();
  helpers();

  return exports;
});