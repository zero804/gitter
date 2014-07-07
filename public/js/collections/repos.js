define([
  'utils/context',
  './base',
  'backbone',
  'cocktail'
], function(context, TroupeCollections, Backbone, cocktail) {
  "use strict";

  var RepoModel = TroupeCollections.Model.extend({
    idAttribute: 'id'
  });

  var ReposCollection = Backbone.Collection.extend({
    model: RepoModel,
    initialize: function() {
      this.url = "/api/v1/user/" + context.getUserId() + "/repos";
    },
    comparator: function(a, b) {
      function compare(a, b) {
        if(a === b) return 0;
        return a < b ? -1 : +1;
      }

      return compare(a.get('name').toLowerCase(), b.get('name').toLowerCase());
    }
  });
  cocktail.mixin(ReposCollection, TroupeCollections.LoadingMixin);

  return {
    ReposCollection: ReposCollection,
    RepoModel:       RepoModel
  };
});
