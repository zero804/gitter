/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'underscore',
  'marionette',
  'views/base',
  './troupeCollectionView'
], function(_, Marionette, TroupeViews, TroupeCollectionView) {
  "use strict";

  return TroupeCollectionView.extend({

    initialize: function(options) {
      this.queries = {}; // { query: results }
      this.troupes = options.troupes;
      this.collection = new Backbone.Collection();
    },

    search: function(query) {
      var self = this;

      query = query.toLowerCase().trim();
      var terms = query.split(' ');

      var troupes = this.troupes;

      // filter the local troupes collection
      var results = troupes.filter(isMatch);

      function isMatch(trp) {
        if (!query) return false;

        var name = (trp.get) ? trp.get('name') || trp.get('displayName') : trp.name || trp.displayName;
        name = name.toLowerCase().trim();
        var names = name.split(' ');
        return name.indexOf(query) === 0 || _.all(terms, function(t) {
          return _.any(names, function(n) { return n.indexOf(t) === 0; });
        });
      }

      // filter the suggestions from the user search service
      this.getSuggestions(query, function(suggestions) {
        var matches = suggestions.filter(isMatch);


        var troupes = _.map(matches, function(suggestion) {

          // check if this result already exists in the search results
          var exists = !!self.collection.findWhere({ url: suggestion.url });

          if (exists) {
            return;
          }

          return new Backbone.Model({
            id: suggestion.id,
            name: suggestion.displayName,
            url: suggestion.url
          });
        });

        // add these results as extra's to the local search results
        self.collection.add(troupes);
      });

      // set the initial local search results
      self.collection.reset(results);
    },

    getSuggestions: function(query, callback) {
      var self = this;

      // if we have done this query already, don't fetch it again (this could be problematic).
      if (this.queries[query])
        return callback(this.queries[query]);

      // if a subset of this query was empty, so is this one
      var emptyPreviously = _.some(this.queries, function(v,k) {
        return query.toLowerCase().indexOf(k.toLowerCase()) === 0 && v.length <= 1;
      });

      if (emptyPreviously) {
        return callback([]);
      }

      var url = '/user';
      $.ajax({ url: url, data : { q: query }, success: function(data) {
        if (data.results) {
          if (!self.searchSuggestions) self.searchSuggestions = [];

          self.searchSuggestions = _.uniq(self.searchSuggestions.concat(data.results), function(s) {
            return s.displayName;
          });

          callback(self.searchSuggestions);
        }
      }});
    }

  });

});