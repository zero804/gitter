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
      // TODO: replicate changes onto the context
      // this.listenTo(this, 'change:name', this.replicateContext);
    },

    operationIsUpToDate: function() {
      return true;
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
