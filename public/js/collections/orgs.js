define([
  'utils/context',
  './base',
  'backbone'
], function(context, TroupeCollections, Backbone) {
  "use strict";

  var OrgModel = TroupeCollections.Model.extend({
    idAttribute: 'id'
  });

  var OrgCollection = Backbone.Collection.extend({
    model: OrgModel,
    initialize: function() {
      this.url = "/api/v1/user/" + context.getUserId() + "/orgs";
      // this.listenTo(this, 'change:name', this.replicateContext);
    }
  });

  return {
    OrgCollection:    OrgCollection,
    OrgModel:         OrgModel
  };
});
