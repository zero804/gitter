define([
  'backbone',
  './chat',
  'cocktail',
  'utils/context',
  './infinite-mixin',
], function (Backbone, chatModels, cocktail, context, InfiniteCollectionMixin) {
  "use strict";

  var ChatSearchCollection = Backbone.Collection.extend({
    model: chatModels.ChatModel,

    modelName: 'chat',

    initialize: function() {
      var troupeId = context.getTroupeId();
      this.url = "/api/v1/rooms/" + troupeId + "/chatMessages";
    },

    queryText: '',

    getQuery: function() {
      return { q: this.queryText };
    },

    parse: function (collection) {
      if (collection.length && collection[0].limitReached) {
        collection.shift();
        this.trigger('limitReached', true);
        var atTopChanged = function(atTop) {

          if(!atTop) {
            this.trigger('limitReached', false);
            this.stopListening(this, 'atTopChanged', atTopChanged);
          }
        }.bind(this);

        this.listenTo(this, 'atTopChanged', atTopChanged);
      }

      collection.forEach(function(chat) {
        chat.burstFinal = true;
        chat.burstStart = true;
      });

      return collection;
    },

    fetchSearch: function(queryText) {
      this.queryText = queryText;
      this.atBottom = false; // TODO: make this nicer
      this.fetchLatest({ });
    }
  });

  cocktail.mixin(ChatSearchCollection, InfiniteCollectionMixin);

  return {
    ChatSearchCollection: ChatSearchCollection
  };
});
