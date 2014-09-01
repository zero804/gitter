define([
  'utils/context',
  './base'
], function(context, TroupeCollections) {
  "use strict";

  var OrgModel = TroupeCollections.Model.extend({
    idAttribute: 'id'
  });

  var OrgCollection = TroupeCollections.LiveCollection.extend({
    model: OrgModel,
    initialize: function() {
      this.url = "/api/v1/user/" + context.getUserId() + "/orgs";
    }
  });

  return {
    OrgCollection:    OrgCollection,
    OrgModel:         OrgModel
  };
});
