define([
  './base',
  './smart-users'
], function(TroupeCollections, SmartUserCollection) {
  "use strict";

  var UserModel = TroupeCollections.Model.extend({
    idAttribute: "id"
  });

  var UserCollection = TroupeCollections.LiveCollection.extend({
    model: UserModel,
    modelName: 'user',
    nestedUrl: "users"
  });

  return {
    RosterCollection: SmartUserCollection.SortedAndLimited,
    SortedUserCollection: SmartUserCollection.Sorted,
    UserCollection: UserCollection,
    UserModel: UserModel
  };

});
