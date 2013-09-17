/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  './base'
], function(TroupeCollections) {
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
    UserCollection: UserCollection,
    UserModel: UserModel
  };

});
