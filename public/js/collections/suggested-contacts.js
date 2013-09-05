/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  './base',
  'backbone',
  'cocktail'
], function(TroupeCollections, Backbone, cocktail) {
  "use strict";

  var Model = TroupeCollections.Model.extend({
    idAttribute: "id"
  });

  var Collection = Backbone.Collection.extend({
    model: Model,
    url: '/api/v1/suggested-contacts'
  });
  cocktail.mixin(Collection, TroupeCollections.SearchResultsCollection);

  return {
    Model: Model,
    Collection: Collection
  };

});
