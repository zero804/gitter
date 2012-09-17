define([
  'jquery',
  'underscore',
  'backbone',
  './base'
], function($, _, Backbone, TroupeCollections) {
  "use strict";

  var exports = {};

  exports.ChatModel = TroupeCollections.Model.extend({
      idAttribute: "id"
    });

  exports.ChatCollection = TroupeCollections.LiveCollection.extend({
    model: exports.ChatModel,
    modelName: 'chat',
    nestedUrl: "chatMessages"
  });

  return exports;
});
