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

  unreadItemsClient.installTroupeListener(troupeCollection);

  /* Utils for comparators, perhaps this should go somewhere useful? */
  function nullish(a) {
    return a === null || a === undefined || a === 0;
  }

  function naturalComparator(a, b) {
    if(a === b) return 0;
    return a > b ? 1 : -1;
  }

  function reverseNaturalComparator(a, b) {
    if(a === b) return 0;
    return a > b ? -1 : 1;
  }

  /* Sort, order things that are not null before things that are null */
  function existenceComparator(a, b) {
    if(!nullish(a)) {
      if(!nullish(b)) {
        return 0;
      } else {
        return -1;
      }
    } else {
      if(!nullish(b)) {
        return 1;
      } else {
        return null;
      }
    }
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

  /**
   * Sorting goes like this:
   * Unread items first, sorted by name, alphabetically,
   * followed by order of most recent access
   */
  recentRoomsNonFavourites.setSort(function(a, b) {
    var c = existenceComparator(a.get('mentions'), b.get('mentions'));
    if(c === 0) {
      /** Both sides have mentions, compare by name */
      return naturalComparator(a.get('name'), b.get('name'));
    } else if(c === null) {
      /* Neither side has mentions, compare by lastAccessTime, descending */

      c = existenceComparator(a.get('unreadItems'), b.get('unreadItems'));
      if(c === 0) {
        /** Both sides have unreadItems, compare by name */
        return naturalComparator(a.get('name'), b.get('name'));
      } else if(c === null) {
        /* Neither side has unreadItems, compare by lastAccessTime, descending */
        var aLastAccessTime = a.get('lastAccessTime');
        var bLastAccessTime = b.get('lastAccessTime');

        return reverseNaturalComparator(aLastAccessTime && aLastAccessTime.valueOf(), bLastAccessTime && bLastAccessTime.valueOf());
      } else {
        return c;
      }

    } else {
      return c;
    }


  });

  // Sync up with the context
  troupeCollection.on("add", function(model) {
    if(model.id == context.getTroupeId()) {
      model.on('change', function(model) {
        context.troupe().set(model.changed);
      });
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
    favourites: favourites,
    recentRoomsNonFavourites: recentRoomsNonFavourites,
    orgs: orgsCollection
  };

});
