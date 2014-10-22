define([
  './base',
  'components/apiClient',
  'backbone',
  'cocktail'
], function(TroupeCollections, apiClient, Backbone, cocktail) {
  "use strict";

  var RepoModel = TroupeCollections.Model.extend({
    idAttribute: 'id'
  });

  var ReposCollection = Backbone.Collection.extend({
    model: RepoModel,
    url: apiClient.user.channelGenerator('/repos'),
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
