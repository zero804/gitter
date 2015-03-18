"use strict";
var _ = require('underscore');
var Backbone = require('backbone');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var moment = require('moment');
var burstCalculator = require('../utils/burst-calculator');
var InfiniteCollectionMixin = require('./infinite-mixin');
var cocktail = require('cocktail');
var log = require('utils/log');
var LiveCollection = require('gitter-realtime-client').LiveCollection;
var realtime = require('components/realtime');
var SyncMixin = require('./sync-mixin');

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

var ChatModel = Backbone.Model.extend({
  idAttribute: "id",
  initialize: function() {
    var t = this;

    function setStatus(s) {
      t.syncStatus = s;
      t.trigger('syncStatusChange', s);
    }

    this.syncStatus = null;

    this.listenTo(this, 'sync', function() {
      setStatus('synced');
    });

    this.listenTo(this, 'request', function() {
      setStatus('syncing');
    });

    this.listenTo(this, 'error', function() {
      setStatus('syncerror');
    });

    // TODO: unlisten on remove from collection
    // to stop memory leaks

  },
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
  },
  sync: SyncMixin.sync
});

var ChatCollection = LiveCollection.extend({
  model: ChatModel,
  modelName: 'chat',
  client: function() {
    return realtime.getClient();
  },
  url: apiClient.room.channelGenerator('/chatMessages'),
  comparator: function(chat1, chat2) {
    var id1 = chat1.id;
    var id2 = chat2.id;
    if (!id1) {
      if (!id2) {
        var s1 = chat1.get('sent');
        var s2 = chat2.get('sent');
        if (!s1) {
          if (!s2) return 0;
          return -1; // null < value
        }
        if (!s2) return 1;
        return s1.valueOf() - s2.valueOf();
      }
      return 1; // null > value (-1)
    }
    if (!id2) return -1; // value < null = -1
    if (id1 == id2) return 0;
    if (id1 < id2) return -1;
    return 1;
  },
  initialize: function() {
    this.listenTo(this, 'add remove', function (model, collection) {
      collection.once('sort', function () {
        burstCalculator.calc.call(this, model);
      });
    });

    this.listenTo(this, 'sync', function (model) {
      // Sync is for collections and models
      if (!(model instanceof Backbone.Model)) return;

      this.checkClientClockSkew(model);
    });

    this.listenTo(this, 'change:sent', function(model) {
      this.checkClientClockSkew(model);
    });

    this.listenTo(this, 'reset sync', function () {
      burstCalculator.parse(this);
    });
  },

  parse: function (collection) {
    return burstCalculator.parse(collection);
  },

  findModelForOptimisticMerge: function (newModel) {
    var optimisticModel = this.find(function(model) {
      return !model.id && model.get('text') === newModel.get('text');
    });

    return optimisticModel;
  },

  checkClientClockSkew: function(model) {
    var sent = model.attributes.sent;
    var previousSent = model.previousAttributes().sent;

    if (sent && previousSent) {
      var diff = sent.valueOf() - previousSent.valueOf();
      if (diff > 20000) {
        log.warn('Clock skew is ' + diff + 'ms');
      }
    }
  },
  sync: SyncMixin.sync
});
cocktail.mixin(ChatCollection, InfiniteCollectionMixin);

var ReadByModel = Backbone.Model.extend({
  idAttribute: "id"
});

var ReadByCollection = LiveCollection.extend({
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
  },
  sync: SyncMixin.sync
});

module.exports = {
  ReadByModel: ReadByModel,
  ReadByCollection: ReadByCollection,
  ChatModel: ChatModel,
  ChatCollection: ChatCollection
};
