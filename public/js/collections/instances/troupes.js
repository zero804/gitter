'use strict';

var Backbone           = require('backbone');
var roomSort           = require('gitter-realtime-client').sortsFilters.model;
var troupeModels       = require('../troupes');
var orgModels          = require('../orgs');
var unreadItemsClient  = require('components/unread-items-frame-client');
var appEvents          = require('utils/appevents');
var Sorted             = require('backbone-sorted-collection');
var errorHandle        = require('utils/live-collection-error-handle');
var context            = require('utils/context');
var moment             = require('moment');
var _                  = require('underscore');
var FilteredCollection = require('backbone-filtered-collection');


module.exports = (function() {
  var orgsCollection = new orgModels.OrgCollection(null, { listen: true });
  var existingRooms = context.getSnapshot('rooms').map(function(data){
    return _.extend(data, { lastAccessTime: moment(data.lastAccessTime) });
  });
  var troupeCollection = new troupeModels.TroupeCollection(existingRooms, { listen: true });

  orgsCollection.on('error', errorHandle.bind(null, 'org-collection'));

  unreadItemsClient.installTroupeListener(troupeCollection);

  function filterTroupeCollection(filter) {
    var c = new FilteredCollection(null, { model: troupeModels.TroupeModel, collection: troupeCollection });
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

  //We never post activity changes back to the server so
  //reset lurk activity for the current room JP 4/2/16
  context.troupe().on('change:id', function(troupe, val){ //jshint unused: true
    var activeRoom = troupeCollection.get(val);
    if(activeRoom) { activeRoom.set('activity', false); }
  });


  var collections = {
    /* All rooms */
    troupes: troupeCollection,
    /* Filtered rooms */
    favourites: favourites,
    recentRoomsNonFavourites: recentRoomsNonFavourites,
    orgs: orgsCollection
  };

  window._troupeCollections = collections;
  return collections;

})();
