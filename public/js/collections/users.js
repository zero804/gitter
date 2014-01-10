/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  './base',
  './smart-users'
], function(TroupeCollections, SmartCollection) {
  "use strict";

  var UserModel = TroupeCollections.Model.extend({
    idAttribute: "id"
  });

  var UserCollection = TroupeCollections.LiveCollection.extend({
    model: UserModel,
    modelName: 'user',
    nestedUrl: "users"
  });

  var SmartUserCollection = new SmartCollection(null, { users: new UserCollection() });

  return {
    SmartUserCollection: SmartUserCollection,
    UserCollection: UserCollection,
    UserModel: UserModel
  };

});
