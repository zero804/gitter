define([
  'underscore',
  'components/apiClient',
  './base',
  '../utils/momentWrapper',
  'cocktail'
], function(_, apiClient, TroupeCollections, moment, cocktail) {
  "use strict";

  var EventModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function(message) {
      if(message.sent) {
        message.sent = moment(message.sent, moment.defaultFormat);
      }

      return message;
    },

    toJSON: function() {
      var d = _.clone(this.attributes);
      var sent = this.get('sent');
      if(sent) {
        // Turn the moment sent value into a string
        d.sent = sent.format();
      }

      // No need to send html back to the server
      delete d.html;

      return d;
    }

  });

  var EventCollection = TroupeCollections.LiveCollection.extend({
    model: EventModel,
    initialize: function() {
      this.on('add reset', this.trim, this);
    },
    trim: function() {
      while (this.length > 20) { this.pop(); }
    },
    modelName: 'event',
    url: apiClient.room.channelGenerator('/events'),
    initialSortBy: "-sent",
    sortByMethods: {
      'sent': function(event) {
        var offset = event.id ? 0 : 300000;

        var sent = event.get('sent');

        if(!sent) return offset;
        return sent.valueOf() + offset;
      }
    },

    findModelForOptimisticMerge: function(newModel) {
      var optimisticModel = this.find(function(model) {
        return !model.id && model.get('text') === newModel.get('text');
      });

      return optimisticModel;
    }
  });
  cocktail.mixin(EventCollection, TroupeCollections.ReversableCollectionBehaviour);

  return {
    EventModel: EventModel,
    EventCollection: EventCollection
  };
});
