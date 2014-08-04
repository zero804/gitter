define([
  'utils/context',
  './base',
  'backbone'
], function(context, TroupeCollections, Backbone) {
  "use strict";

  var CollabModel = TroupeCollections.Model.extend({
    idAttribute: 'id'
  });

  var CollabCollection = Backbone.Collection.extend({
    model: CollabModel,

    initialize: function() {
      this.url = "/api/v1/rooms/" + context.getTroupeId() + "/collaborators";
    }
  });

  return {
    CollabCollection: CollabCollection,
    CollabModel: CollabModel
  };
});
