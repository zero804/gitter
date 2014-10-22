define([
  'components/apiClient',
  './base'
], function(apiClient, TroupeCollections) {
  "use strict";

  var OrgModel = TroupeCollections.Model.extend({
    idAttribute: 'name' // Unusual...
  });

  var OrgCollection = TroupeCollections.LiveCollection.extend({
    model: OrgModel,
    url: apiClient.user.channelGenerator('/orgs')
  });

  return {
    OrgCollection:    OrgCollection,
    OrgModel:         OrgModel
  };
});
