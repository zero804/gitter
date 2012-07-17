define([
  'jquery',
  'underscore',
  'backbone',
  './base',
  'models/conversation'
], function($, _, Backbone, TroupeCollections, ConversationModel) {
  return TroupeCollections.LiveCollection.extend({
    model: ConversationModel,
    modelName: 'conversation',
    nestedUrl: "conversations"
  });

});
