/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
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
    if(!m) return false;
    for(var i = 0; i < m.length; i++) {
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

  var InfiniteCollection = {
    fetchMoreBefore: function(options, callback, context) {
      if(this.atTop) return;
      if(this._isFetching) return;
      this._isFetching = true;

      var beforeId;
      if(this.length) {
        beforeId = _.min(this.pluck('id'), function(a, b) {
          if(a === b) return 0;
          return a > b ? 1 : -1;
        });
      }
      console.log('FETCH MORE BEFORE!!!', beforeId);

      var data = { beforeId: beforeId };
      var self = this;

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response) {
          delete self._isFetching;
          console.log(response.length);
          if(response.length < 50) {
            // NO MORE
            self.atTop = true;
          }
          while(self.length > 150) {
            self.pop();
            self.atBottom = false;
          }
          if(callback) callback.call(context);
        },
        error: function(err) {
          if(callback) callback.call(err);
        }
      });
    },

    fetchMoreAfter: function(options, callback, context) {
      console.log('SELF AT BOTTOM', this.atBottom);
      if(this.atBottom) return;
      if(this._isFetching) return;
      this._isFetching = true;
      var afterId;
      if(this.length) {
        afterId = _.max(this.pluck('id'), function(a, b) {
          if(a === b) return 0;
          return a > b ? 1 : -1;
        });
      }
      console.log('FETCH MORE AFTER!!!', afterId);

      var data = { afterId: afterId };
      var self = this;

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response) {
          delete self._isFetching;
          console.log(response.length);
          if(response.length < 50) {
            // NO MORE
            self.atBottom = true;
          }
          while(self.length > 150) {
            self.shift();
            self.atTop = false;
          }
          if(callback) callback.call(context);
        },
        error: function(err) {
          if(callback) callback.call(err);
        }
      });
    }
  };


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

    findModelForOptimisticMerge: function(newModel) {
      var optimisticModel = this.find(function(model) {
        return !model.id && model.get('text') === newModel.get('text');
      });

      return optimisticModel;
    }
  });
  cocktail.mixin(ChatCollection, TroupeCollections.ReversableCollectionBehaviour);
  cocktail.mixin(ChatCollection, InfiniteCollection);

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
