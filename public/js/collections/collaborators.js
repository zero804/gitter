define([
  'components/apiClient',
  './base',
  'backbone'
], function(apiClient, TroupeCollections, Backbone) {
  "use strict";

  var CollabModel = TroupeCollections.Model.extend({
    idAttribute: 'id'
  });

  var CollabCollection = Backbone.Collection.extend({
    model: CollabModel,
    url: apiClient.room.channelGenerator("/collaborators")
  });

  return {
    CollabCollection: CollabCollection,
    CollabModel: CollabModel
  };
});
