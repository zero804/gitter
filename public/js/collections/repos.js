/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  './base',
  'backbone'
], function(context, TroupeCollections, Backbone) {
  "use strict";

  var RepoModel = TroupeCollections.Model.extend({
    idAttribute: 'id'
  });

  var ReposCollection = Backbone.Collection.extend({
    model: RepoModel,
    initialize: function() {
      this.url = "/api/v1/user/" + context.getUserId() + "/repos";
      // this.listenTo(this, 'change:name', this.replicateContext);
    }
  });

  return {
    ReposCollection: ReposCollection,
    RepoModel:       RepoModel
  };
});
