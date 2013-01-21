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
    }
  });

  exports.ChatCollection = TroupeCollections.LiveCollection.extend({
    model: exports.ChatModel,
    modelName: 'chat',
    nestedUrl: "chatMessages",
    findModelForOptimisticMerge: function(newModel) {
      var optimisticModel = this.find(function(model) {
        return !model.id && model.get('text') === newModel.get('text');
      });

      return optimisticModel;
    }
  });

  return exports;
});
