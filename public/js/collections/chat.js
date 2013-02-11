/*jshint unused:true browser:true*/
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
    parse: function(response) {
      response.sent = moment.utc(response.sent);
      return response;
    },
    toJSON: function(options) {
      var d = _.clone(this.attributes);
      var sent = this.get('sent');
      if(sent) {
        // Turn the moment sent value into a string
        d.sent = sent.utc();
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
