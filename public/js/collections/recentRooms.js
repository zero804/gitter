/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'utils/context',
  './base',
  '../utils/momentWrapper'
], function(_, context, TroupeCollections, moment) {
  "use strict";

  var RoomModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function(message) {
      if(typeof message.lastAccessTime === 'string') {
        message.lastAccessTime = moment(message.lastAccessTime, moment.defaultFormat);
      } else if(!('lastAccessTime' in message)) {
        message.lastAccessTime = null;
      }

      if(!('favourite' in message)) {
        message.favourite = false;
      }

      return message;
    }
  }, { modelType: 'troupe' });

  /* Natural sort */
  function natural(a, b)  {
    if(a == b) return 0;
    return a > b ? 1 : -1;
  }

  var RoomCollection = TroupeCollections.LiveCollection.extend({
    model: RoomModel,
    comparator: function(a, b) {
      var aFavourite = a.get('favourite');
      var bFavourite = b.get('favourite');
      // Favourites first
      if(aFavourite) {
        if(bFavourite) {
          var favSort = natural(aFavourite, bFavourite);
          if(favSort !== 0) {
            return favSort;
          }
          return natural(a.get('name'), b.get('name'));
        }

        // a is a fav, but b is not, a should be before b
        return -1;
      } else if(bFavourite) {
        return 1;
      }

      // Recents next, in DESCENDING order
      var aLastAccessTime = a.get('lastAccessTime');
      var bLastAccessTime = b.get('lastAccessTime');

      return natural(bLastAccessTime, aLastAccessTime);
    },

    initialize: function() {
      var self = this;
      var delayedSort = _.debounce(function() {
        self.sort();
      }, 50);
      self.url = "/api/v1/user/" + context.getUserId() + "/recentRooms";
      self.listenTo(self, 'change:lastAccessTime change:name change:favourite', delayedSort);
      self.listenTo(self, 'change:favourite', self.reorderFavs);
      // TODO: replicate changes onto the context
      // this.listenTo(this, 'change:name', this.replicateContext);
    },

    operationIsUpToDate: function() {
      /* Special case for recent rooms as troupe._v doesn't update for fav updates */
      return true;
    },

    reorderFavs: function(event) {
      /**
       * We need to do some special reordering in the event of a favourite being positioned
       * This is to mirror the changes happening on the server
       * @see recent-room-service.js@addTroupeAsFavouriteInPosition
       */

      /* This only applies when a fav has been set */
      if(!event.changed || !event.changed.favourite) {
        return;
      }

      if(this.reordering) return;
      this.reordering = true;

      var favourite = event.changed.favourite;

      var forUpdate = this
                        .map(function(room) {
                          return { id: room.id, favourite: room.get('favourite') };
                        })
                        .filter(function(room) {
                          return room.favourite >= favourite && room.id !== event.id;
                        });

      forUpdate.sort(function(a, b) {
        return a.favourite - b.favourite;
      });

      var next = favourite;
      for(var i = 0; i < forUpdate.length; i++) {
        var item = forUpdate[i];

        if(item.favourite > next) {
          forUpdate = forUpdate.slice(0, i - 1);
          break;
        }

        item.favourite++;
        next = item.favourite + 1;
      }
      var self = this;
      forUpdate.forEach(function(r) {
        var id = r.id;
        var value = r.favourite;
        var t = self.get(id);
        t.set('favourite', value);
      });

      delete this.reordering;
    },

    // replicateContext: function(model) {
    //   if(model.id === context.getTroupeId()) {
    //     context.troupe().set(model.toJSON());
    //   }
    // }
  });

  return {
    RoomCollection: RoomCollection,
    RoomModel:      RoomModel
  };
});
