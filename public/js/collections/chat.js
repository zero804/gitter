define([
  'underscore',
  'utils/context',
  './base',
  '../utils/momentWrapper',
  './infinite-mixin',
  'cocktail'
], function(_, context, TroupeCollections, moment, InfiniteCollectionMixin, cocktail) {
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
    parse: function(message) {
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
      this.listenTo(this, 'add reset sync remove', function () {
        this.calculateBursts();
      });
    },
    // subscriptionOptions: function() {
    //   return { aroundId: '539adf13fad68e388a5de07e' };
    // },
    findModelForOptimisticMerge: function(newModel) {
      var optimisticModel = this.find(function(model) {
        return !model.id && model.get('text') === newModel.get('text');
      });

      return optimisticModel;
    },

    /**
      * setFinalBurst() sets the final burst class for the previous chat item once a new burst happens
      *
      * chatItem `Object` chat-item to be set as burst final
      * void
      */
    setFinalBurst: function (chatItem) {
      chatItem.set('burstFinal', true);
    },

    /**
      * TODO: OPTIMIZE THIS
      * calculateBursts() calculates what chat messages are 'bursts'.
      */
    calculateBursts: function () {
      /* @const - time window, in which an user can keep adding chat items as part of a initial "burst" */
      var BURST_WINDOW = 5 * 60 * 1000; // 5 minutes

      var burstUser,
          burstStart,
          self = this;

      this.forEach(function (chat, index, chats) {

        /* most messages won't be a burst */
        chat.set('burstFinal', false);

        var fromUser = chat.get('fromUser');
        var newUser = fromUser && fromUser.username;
        var newSentTime = chat.get('sent');

        /* if message is a me status */
        if (chat.get('status')) {
          burstUser = null;
          chat.set('burstStart', true);
          if (index !== 0) self.setFinalBurst(chats[index - 1]);
          return;
        }

        /* if the message is by a there is not a burst user then we're starting a burst */
        if (!burstUser) {
          burstUser = newUser;
          burstStart = newSentTime;
          chat.set('burstStart', true);
          if (index !== 0) self.setFinalBurst(chats[index - 1]);
          return;
        }

        /* get tge duration since last burst */
        var durationSinceBurstStart = newSentTime.valueOf() - burstStart.valueOf();

        /* if the current user is different or the duration since last burst is larger than 5 minutes we have a new burst */
        if (newUser !== burstUser || durationSinceBurstStart > BURST_WINDOW) {
          burstUser = newUser;
          burstStart = newSentTime;
          chat.set('burstStart', true);
          if (index !== 0) self.setFinalBurst(chats[index - 1]);
          return;
        }

        /* most messages won't be a burst */
        chat.set('burstStart', false);
      });
    }
  });
  cocktail.mixin(ChatCollection, InfiniteCollectionMixin, TroupeCollections.ReversableCollectionBehaviour);

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
