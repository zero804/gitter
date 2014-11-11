"use strict";
var _ = require('underscore');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var TroupeCollections = require('./base');
var moment = require('../utils/momentWrapper');
var burstCalculator = require('../utils/burst-calculator');
var InfiniteCollectionMixin = require('./infinite-mixin');
var cocktail = require('cocktail');

module.exports = (function() {


  var userId = context.getUserId();

  function mentionsUser(message) {
    if(!userId) return false;

    var m = message.mentions;
    if (!m) return false;

    for (var i = 0; i < m.length; i++) {
      var mention = m[i];
      if(!mention.group && mention.userId === userId) return true;
      if(mention.group && mention.userIds && mention.userIds.indexOf(userId) >= 0) return true;
    }

    return false;
  }

  var ChatModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function (message) {

      if (message.sent) {
        message.sent = moment(message.sent, moment.defaultFormat);
      }

      if (message.editedAt) {
        message.editedAt = moment(message.editedAt, moment.defaultFormat);
      }

      // Check for the special case of messages from the current user
      if (message.unread && message.fromUser) {
        if (message.fromUser.id === userId) {
          message.unread = false;
        }
      }

      if (mentionsUser(message)) {
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
    url: apiClient.room.channelGenerator('/chatMessages'),
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
      this.listenTo(this, 'add remove', function (model, collection) {
        collection.once('sort', function () {
          burstCalculator.calc.call(this, model);
        });
      });

      this.listenTo(this, 'reset sync', function () {
        burstCalculator.parse(this);
      });
    },
    parse: function (collection) {
      if(collection.length && collection[0].limitReached) {
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

      return burstCalculator.parse(collection);
    },
    findModelForOptimisticMerge: function (newModel) {
      var optimisticModel = this.find(function(model) {
        return !model.id && model.get('text') === newModel.get('text');
      });

      return optimisticModel;
    },
  });
  cocktail.mixin(ChatCollection, InfiniteCollectionMixin, TroupeCollections.ReversableCollectionBehaviour);

  var ReadByModel = TroupeCollections.Model.extend({
    idAttribute: "id"
  });

  var ReadByCollection = TroupeCollections.LiveCollection.extend({
    model: ReadByModel,
    modelName: 'chatReadBy',
    initialize: function(models, options) { // jshint unused:true
      var userCollection = options.userCollection;
      if(userCollection) {
        this.transformModel = function(model) {
          var m = userCollection.get(model.id);
          if(m) return m.toJSON();

          return model;
        };
      }

      var chatMessageId = options.chatMessageId;
      this.url = apiClient.room.channelGenerator("/chatMessages/" + chatMessageId + "/readBy");
    }
  });

  return {
    ReadByModel: ReadByModel,
    ReadByCollection: ReadByCollection,
    ChatModel: ChatModel,
    ChatCollection: ChatCollection
  };

})();

