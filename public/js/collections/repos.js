"use strict";
var TroupeCollections = require('./base');
var apiClient = require('components/apiClient');
var Backbone = require('backbone');
var cocktail = require('cocktail');

module.exports = (function() {


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

})();

