/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'backbone',
  './troupeCollectionView'
], function($, _, Backbone, TroupeCollectionView) {
  "use strict";

  return TroupeCollectionView.extend({

    initialize: function(options) {

      this.queries = {}; // { query: results }
      this.troupes = options.troupes;
      this.collection = new Backbone.Collection();
      this.selectedIndex = 0;
      this.query = '';
      this.$input = options.$input;

      // listen for keypresses on the input
      var self = this;
      this.$input.on('keyup', function(e) {
        $(window).trigger('showSearch');
        return self.keyPress(e);
      });
    },

    search: function(query) {
      var self = this;

      query = query.toLowerCase().trim();

      if (query === '')
        $(window).trigger('hideSearch');
      // don't do anything if the search term hasn't changed
      if (query === this.query)
        return;
      else
        this.query = query;

      function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
      }

      var terms = query.split(' ');
      var termsRe = new RegExp("\\b(" + _.map(terms, escapeRegExp).join("|") + ")", "i");

      var troupes = this.troupes;

      // filter the local troupes collection
      var results = troupes.filter(isMatch);

      function isMatch(t) {

        function match(string) {
          return string && string.match(termsRe);
        }

        if (!query) return false;
        if(match(t.get ? t.get('name') : t.name)) return true;

        // Matching directly against a username
        if(match(t.get ? t.get('username') : t.username)) return true;
        if(match(t.get ? t.get('displayName') : t.displayName)) return true;
        if(match(t.get ? t.get('url') : t.url)) return true;

        return false;
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
      self.select(0);
    },

    getSuggestions: function(query, callback) {
      var self = this;

      if (!query)
        return;

      // if we have done this query already, don't fetch it again (this could be problematic).
      if (this.queries[query]) {
        setTimeout(function() { callback(self.queries[query]); }, 0); // simulate async callback
        return;
      }

      // if a superset of this query was empty, so is this one
      var emptyPreviously = _.some(this.queries, function(v,k) {
        return query.toLowerCase().indexOf(k.toLowerCase()) === 0 && v.length === 0;
      });

      if (emptyPreviously) {
        setTimeout(function() { callback([]); }, 0);
        return;
      }

      $.ajax({ url: '/api/v1/user', data : { q: query, unconnected:1 }, success: function(data) {
        if (data.results) {
          if (!self.queries[query]) self.queries[query] = [];

          self.queries[query] = _.uniq(self.queries[query].concat(data.results), function(s) {
            return s.displayName;
          });

          callback(self.queries[query]);
        }
      }});
    },

    keyPress: function(e) {
      this.keyNavigation(e);
      this.keySearch(e);
    },

    keyNavigation: function(e) {
      // select one of the search results
      // enter follows link
      switch(e.keyCode) {
        case 38: // up
          this.selectPrev();
          break;
        case 40: // down
          this.selectNext();
          break;
        case 13: // enter
        case 39: // right
          this.navigateToCurrent();
          break;
      }
    },

    selectPrev: function() {
      this.select(this.selectedIndex - 1);
    },

    selectNext: function() {
      this.select(this.selectedIndex + 1);
    },

    navigateToCurrent: function() {
      window.location = this.collection.at(this.selectedIndex).get('url');
    },

    select: function(i) {
      var itemElements = this.$el.find('.trpTroupeName');

      if (i >= 0 && i < itemElements.length) {
        this.selectedIndex = i;
        itemElements.removeClass('selected');
        $(itemElements[this.selectedIndex]).addClass('selected');
      }
    },

    keySearch: _.debounce(function(e) {
      this.search(this.$input.val());
    }, 250)

  });

});