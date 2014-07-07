define([
  'underscore',
  'utils/context',
  './base',
  '../utils/momentWrapper',
  'cocktail'
], function(_, context, TroupeCollections, moment, cocktail) {
  "use strict";

  var userId = context.getUserId();

  function mentionsUser(message) {
    var m = message.mentions;
    if (!m) return false;
    for (var i = 0; i < m.length; i++) {
      if(userId && m[i].userId === userId) return true;
    }
    return false;
  }

  var ChatModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function (message) {

      if(message.sent) {
        message.sent = moment(message.sent, moment.defaultFormat);
      }

      if(message.editedAt) {
        message.editedAt = moment(message.editedAt, moment.defaultFormat);
      }

      // Check for the special case of messages from the current user
      if(message.unread && message.fromUser) {
        if(message.fromUser.id === userId) {
          message.unread = false;
        }
      }

      if(mentionsUser(message)) {
        message.mentioned = true;
      } else {
        message.mentioned = false;
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

  var ChatCollection = TroupeCollections.LiveCollection.extend({
    BURST_WINDOW: 5 * 60 * 1000, /* @const - time window, in which an user can keep adding chat-items as part of a initial "burst" */
    model: ChatModel,
    modelName: 'chat',
    nestedUrl: "chatMessages",
    initialSortBy: "sent",
    sortByMethods: {
      'sent': function(chat) {
        var offset = chat.id ? 0 : 300000;

        var sent = chat.get('sent');

        if(!sent) return offset;
        return sent.valueOf() + offset;
      }
    },
    initialize: function() {
      var self = this;

      this.listenTo(this, 'add remove', function (model, ctx, options) {
        if('burstStart' in model.attributes) return; // already calculated bursts for this batch
        this.calculateBurst(model);
      });

      this.listenTo(this, 'reset', function (collection, options) {
        collection.each(function (model) {
          self.calculateBurst(model);
        });
      });
    },
    parse: function (collections) {
      return this.parseBursts(collections);
    },
    findModelForOptimisticMerge: function (newModel) {
      var optimisticModel = this.find(function(model) {
        return !model.id && model.get('text') === newModel.get('text');
      });

      return optimisticModel;
    },
    /**
     * findBurstStart() it retrieves the start of a burst for a given chat-item
     *
     * chatItem Backbone.Model the item in which we're trying to find a suitable burst start 
     * @return Backbone.Model the potential burst start for the given chat-item
     */
    findBurstStart: function (chatItem) {
      var prevChatItem = this.at(this.indexOf(chatItem) - 1);
      while (!prevChatItem.get('burstStart')) {
        prevChatItem = this.at(this.indexOf(prevChatItem) - 1);
      }
      return prevChatItem;
    },
    /**
     * calculateBurst() it calculates bursts based on the latest item used on resets and add events
     *
     * chatItem Backbone.Model the chat-item to be determined whether it is a burst start or not 
     * @return void it affects the model directly
     */
    calculateBurst: function (chatItem) {
      
      // the top will always be a burst
      if (this.indexOf(chatItem) === 0) {
        chatItem.set('burstStart', true);
        return;
      }
      
      // previous chat-item details
      var prevChatItem = this.at(this.indexOf(chatItem) - 1);
      var prevUser = prevChatItem.get('fromUser') && prevChatItem.get('fromUser').username;
      var prevSentTime = prevChatItem.get('sent').valueOf();
      var prevIsStatus = prevChatItem.get('status');
      
      // current chat-item details
      var currUser = chatItem.get('fromUser') && chatItem.get('fromUser').username;
      var currSentTime = chatItem.get('sent').valueOf();
      var currIsStatus = chatItem.get('status');

      // always set the chat-item to be false for both final and start
      chatItem.set('burstFinal', false);
      chatItem.set('burstStart', false);

      // if the current user is different to the previous user we have a burst
      if (currUser !== prevUser || prevIsStatus || currIsStatus || (currSentTime - prevSentTime) > this.BURST_WINDOW) {
        chatItem.set('burstStart', true);
        prevChatItem.set('burstFinal', true);
        return;
      }

      // find the previous burst start
      var burstStart = this.findBurstStart(chatItem) || null;

      // If the burst window is closed create a new burst
      if ((currSentTime - burstStart.get('sent').valueOf()) > this.BURST_WINDOW) {
        chatItem.set('burstStart', true);
        prevChatItem.set('burstFinal', true);
        return;
      }
    },
    /**
      * parseBursts() calculates what chat messages are 'bursts', this is used for parsing fetches from the server.
      */
    parseBursts: function (collection) {

      if (!collection) return;

      var burstUser,
          burstStart,
          self = this;

      return collection.map(function (chat, index) {

        // get the duration since last burst
        var sinceBurstStart = new Date(newSentTime) - new Date(burstStart);
        var fromUser = chat.fromUser;
        var newUser = fromUser && fromUser.username;
        var newSentTime = chat.sent;

        // always set the chat-item to be false for both final and start
        chat.burstFinal = false;
        chat.burstStart = false;

        // `/me` status
        if (chat.status) {
          burstUser = null;
          chat.burstStart = true;
          if (index !== 0) collection[index - 1].burstFinal = true;
          return chat;
        }

        // if we do not currently have a burst user set new as current and create a new burst
        if (!burstUser) {
          burstUser = newUser;
          burstStart = newSentTime;
          chat.burstStart = true;
          if (index !== 0) collection[index - 1].burstFinal = true;
          return chat;
        } 

        // if the current user is different or the duration since last burst is larger than 5 minutes we have a new burst
        if (newUser !== burstUser || sinceBurstStart > self.BURST_WINDOW) {
          burstUser = newUser;
          burstStart = newSentTime;
          chat.burstStart = true;
          if (index !== 0) collection[index - 1].burstFinal = true;
          return chat;
        }

        return chat;
      });
      return collection;
    }
  });

  cocktail.mixin(ChatCollection, TroupeCollections.ReversableCollectionBehaviour);

  var ReadByModel = TroupeCollections.Model.extend({
    idAttribute: "id"
  });

  var ReadByCollection = TroupeCollections.LiveCollection.extend({
    model: ReadByModel,
    modelName: 'chatReadBy',
    initialize: function(models, options) {
      var userCollection = options.userCollection;
      if(userCollection) {
        this.transformModel = function(model) {
          var m = userCollection.get(model.id);
          if(m) return m.toJSON();

          return model;
        };
      }

      this.chatMessageId = options.chatMessageId;
      this.url = "/api/v1/rooms/" + context.getTroupeId() + "/chatMessages/" + this.chatMessageId + "/readBy";
    }
  });

  return {
    ReadByModel: ReadByModel,
    ReadByCollection: ReadByCollection,
    ChatModel: ChatModel,
    ChatCollection: ChatCollection
  };
});
