define([
  'backbone',
  './chat',
  'components/apiClient',
  'cocktail',
  'utils/context',
  './infinite-mixin',
], function (Backbone, chatModels, apiClient, cocktail, context, InfiniteCollectionMixin) {
  "use strict";

  var ChatSearchCollection = Backbone.Collection.extend({
    model: chatModels.ChatModel,

    modelName: 'chat',
    url: apiClient.room.channelGenerator('/chatMessages'),
    queryText: '',

    getQuery: function() {
      return { q: this.queryText, lang: context.lang() };
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

    fetchSearch: function(queryText, callback, context) {
      this.queryText = queryText;
      this.atBottom = false; // TODO: make this nicer
      this.fetchLatest({ }, callback, context);
    }
  });

  cocktail.mixin(ChatSearchCollection, InfiniteCollectionMixin);

  return {
    ChatSearchCollection: ChatSearchCollection
  };
});
