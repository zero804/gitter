/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  './base',
  '../utils/momentWrapper'
], function($, _, Backbone, TroupeCollections, moment) {
  /*jslint browser: true*/
  "use strict";

  var exports = {};

  exports.ChatModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function(message) {
      message.sent = moment(message.sent, moment.defaultFormat);

      // Check for the special case of messages from the current user
      if(message.unread && message.fromUser) {
        if(message.fromUser.id === window.troupeContext.user.id) {
          message.unread = false;
        }
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
      return d;
    }

  });

  exports.ChatCollection = TroupeCollections.LiveCollection.extend({
    model: exports.ChatModel,
    modelName: 'chat',
    nestedUrl: "chatMessages",
    sortByMethods: {
      'sent': function(chat) {
        var sent = chat.get('sent');
        if(!sent) return 0;
        return sent.valueOf();
      }
    },

    initialize: function() {
      this.setSortBy('sent');
    },

    findModelForOptimisticMerge: function(newModel) {
      var optimisticModel = this.find(function(model) {
        return !model.id && model.get('text') === newModel.get('text');
      });

      return optimisticModel;
    }
  });
  _.extend(exports.ChatCollection.prototype, TroupeCollections.ReversableCollectionBehaviour);

  return exports;
});
