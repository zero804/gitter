define([
  './base',
  'components/apiClient',
  './smart-users'
], function(TroupeCollections, apiClient, SmartUserCollection) {
  "use strict";

  var UserModel = TroupeCollections.Model.extend({
    idAttribute: "id"
  });

  var UserCollection = TroupeCollections.LiveCollection.extend({
    model: UserModel,
    modelName: 'user',
    url: apiClient.room.channelGenerator('/users')
  });

  return {
    RosterCollection: SmartUserCollection.SortedAndLimited,
    SortedUserCollection: SmartUserCollection.Sorted,
    UserCollection: UserCollection,
    UserModel: UserModel
  };

});
