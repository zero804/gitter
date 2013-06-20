/* jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  'components/realtime',
  'collections/troupes',
  'components/webNotifications',
  'components/unread-items-client',
  'filtered-collection' /* no ref */
], function($, _, Backbone, realtime, troupeModels, webNotifications, unreadItemsClient) {
  "use strict";

  function instantiateWithPreloader(preloader) {
    var troupeCollection, filteredTroupeCollection,
    unreadTroupeCollection, peopleOnlyTroupeCollection, favouriteTroupesCollection, recentTroupeCollection;

    troupeCollection       = new troupeModels.TroupeCollection(null, { preloader: preloader, listen: true });

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
    troupeCollection.on('reset sync', function() {
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

    return {
      troupes: troupeCollection,
      peopleTroupes: peopleOnlyTroupeCollection,
      normalTroupes: filteredTroupeCollection,
      recentTroupes: recentTroupeCollection,
      unreadTroupes: unreadTroupeCollection,
      favouriteTroupes: favouriteTroupesCollection
    };

  }

  return {
    instantiateWithPreloader: instantiateWithPreloader
  }
});