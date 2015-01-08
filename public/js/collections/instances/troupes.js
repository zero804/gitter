'use strict';
/* jshint unused:true, browser:true */
var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var context = require('utils/context');
var roomSort = require('utils/room-sort');
var base = require('../base');
var realtime = require('components/realtime');
var troupeModels = require('../troupes');
var orgModels = require('../orgs');
var unreadItemsClient = require('components/unread-items-frame-client');
var appEvents = require('utils/appevents');
var Sorted = require('backbone-sorted-collection');
require('filtered-collection');

module.exports = (function() {


  var orgsCollection = new orgModels.OrgCollection(null, { listen: true });
  var troupeCollection = new troupeModels.TroupeCollection(null, { listen: true });
  var suggestedCollection = new troupeModels.SuggestedTroupeCollection(null, { listen: false });

  unreadItemsClient.installTroupeListener(troupeCollection);

  function filterTroupeCollection(filter) {
    var c = new Backbone.FilteredCollection(null, { model: troupeModels.TroupeModel, collection: troupeCollection });
    c.setFilter(filter);
    var sorted = new Sorted(c);
    return sorted;
  }

  // collection of favourited troupes
  var favourites = filterTroupeCollection(roomSort.favourites.filter);
  favourites.setSort(roomSort.favourites.sort);

  // collection of recent troupes exc. favourites
  var recentRoomsNonFavourites = filterTroupeCollection(roomSort.recents.filter);
  recentRoomsNonFavourites.setSort(roomSort.recents.sort);

  // Sync up with the context
  troupeCollection.on("add", function(model) {
    if(model.id == context.getTroupeId()) {
      model.on('change', function(model) {
        context.troupe().set(model.changed);
      });
    }

    var uri = model.get('uri');
    if(uri) {
      // No one-to-ones
      var suggestions = suggestedCollection.findWhere({ uri: uri });
      suggestedCollection.remove(suggestions);
    }

  });

  appEvents.on('activity', function(message) {
    /* Lurk mode... */

    var troupeId = message.troupeId;
    var model = troupeCollection.get(troupeId);
    if(!model) return;

    if(!model.get('lurk')) return;
    var a = model.get('activity');
    if(a) {
      model.set('activity', a + 1);
    } else {
      model.set('activity', 1);
    }
  });


  var collections = {
    /* All rooms */
    troupes: troupeCollection,
    /* Filtered rooms */
    suggested: suggestedCollection,
    favourites: favourites,
    recentRoomsNonFavourites: recentRoomsNonFavourites,
    orgs: orgsCollection
  };

  window._troupeCollections = collections;
  return collections;

})();

