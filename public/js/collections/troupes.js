/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  './base',
  '../utils/momentWrapper'
], function(context, TroupeCollections, moment) {
  "use strict";

  var TroupeModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function(message) {
      if(typeof message.lastAccessTime === 'string') {
        message.lastAccessTime = moment(message.lastAccessTime, moment.defaultFormat);
      }

      return message;
    }
  }, { modelType: 'troupe' });

  var TroupeCollection = TroupeCollections.LiveCollection.extend({
    model: TroupeModel,
    initialize: function() {
      this.listenTo(this, 'change:favourite', this.reorderFavs);
      this.url = "/api/v1/user/" + context.getUserId() + "/troupes";
    },

    reorderFavs: function(event) {
      /**
       * We need to do some special reordering in the event of a favourite being positioned
       * This is to mirror the changes happening on the server
       * @see recent-room-service.js@addTroupeAsFavouriteInPosition
       */

      /* This only applies when a fav has been set */
      if(!event.changed || !event.changed.favourite || this.reordering) {
        return;
      }

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
          forUpdate.splice(i, forUpdate.length);
          break;
        }

        item.favourite++;
        next = item.favourite;
      }

      var self = this;
      forUpdate.forEach(function(r) {
        var id = r.id;
        var value = r.favourite;
        var t = self.get(id);
        t.set('favourite', value);
      });

      delete this.reordering;
    }
  });

  return {
    TroupeCollection: TroupeCollection,
    TroupeModel:      TroupeModel
  };
});
