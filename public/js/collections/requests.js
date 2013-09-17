/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  './base'
], function(TroupeCollections) {
  "use strict";

  var RequestModel = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    }

  });

  var RequestCollection = TroupeCollections.LiveCollection.extend({
    model: RequestModel,
    modelName: 'request',
    nestedUrl: "requests"
  });

  return {
    RequestModel: RequestModel,
    RequestCollection: RequestCollection
  };

});
