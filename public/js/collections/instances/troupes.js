/* jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  'utils/context',
  '../base',
  'components/realtime',
  '../troupes',
  '../orgs',
  'components/unread-items-frame-client',
  'utils/appevents',
  'backbone-sorted-collection',
  'filtered-collection' /* no ref */
], function($, _, Backbone, context, base, realtime, troupeModels, orgModels, unreadItemsClient, appEvents, Sorted) {
  'use strict';

  var orgsCollection = new orgModels.OrgCollection(null, { listen: true });
  var troupeCollection = new troupeModels.TroupeCollection(null, { listen: true });
  var suggestedCollection = new troupeModels.SuggestedTroupeCollection(null, { listen: false });

  unreadItemsClient.installTroupeListener(troupeCollection);

  /* Utils for comparators, perhaps this should go somewhere useful? */
  function naturalComparator(a, b) {
    if(a === b) return 0;
    return a > b ? 1 : -1;
  }

  var sections = ['lastMentionTime', 'lastUnreadItemTime', 'lastAccessTimeNoSync'];

  function getSectionRank(roomModel) {
    if(roomModel.get('lastMentionTime')) {
      return 0;
    } else if(roomModel.get('lastUnreadItemTime')) {
      return 1;
    } else if(roomModel.get('lastAccessTimeNoSync')) {
      return 2;
    } else {
      return 3;
    }
  }

  function sectionTimeComparator(a, b, sectionRank) {
    var property = sections[sectionRank];

    if(!property) return 0;

    return b.get(property).valueOf() - a.get(property).valueOf();
  }

  /* ---- end of comparators ---- */

  function filterTroupeCollection(filter) {
    var c = new Backbone.FilteredCollection(null, { model: troupeModels.TroupeModel, collection: troupeCollection });
    c.setFilter(filter);
    var sorted = new Sorted(c);
    return sorted;
  }

  // collection of favourited troupes
  var favourites = filterTroupeCollection(function(m) {
    return m.get('favourite');
  });

  /* Favs are sorted by favourite field in ASC order, with name as a secondary order */
  favourites.setSort(function(a, b) {
    var c = naturalComparator(a.get('favourite'), b.get('favourite'));
    if(c !== 0) return c;
    return naturalComparator(a.get('name'), b.get('name'));
  });

  var recentRoomsNonFavourites = filterTroupeCollection(function(m) {
    /* Not a favourite, but has a lastAccessTime */
    return !m.get('favourite') && (m.get('lastAccessTime') || m.get('unreadItems') || m.get('mentions'));
  });

  recentRoomsNonFavourites.setSort(function(a, b) {
    var aSectionRank = getSectionRank(a);
    var bSectionRank = getSectionRank(b);

    if(aSectionRank === bSectionRank) {
      return sectionTimeComparator(a, b, aSectionRank);
    } else {
      return aSectionRank - bSectionRank;
    }
  });

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

  return {
    /* All rooms */
    troupes: troupeCollection,
    /* Filtered rooms */
    suggested: suggestedCollection,
    favourites: favourites,
    recentRoomsNonFavourites: recentRoomsNonFavourites,
    orgs: orgsCollection
  };

});
