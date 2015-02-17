"use strict";
var appEvents = require('utils/appevents');
var apiClient = require('components/apiClient');
var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var textFilter = require('utils/text-filter');
var RoomCollectionView = require('./room-collection-view');
var troupeCollections = require('collections/instances/troupes');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');

// FIXME: THIS IS ACTUALLY THE RESULTS VIEW ONLY. WC.

module.exports = (function() {

  var View = RoomCollectionView.extend({

    keyboardEvents: {
      'search.prev': 'onKeySearchPrev',
      'search.next': 'onKeySearchNext',
      'search.go': 'onKeySearchGo',
      'search.escape': 'onKeySearchEscape'
      // 'chat.escape': 'onKeyChatEscape'
    },

    initialize: function(options) {

      this.user_queries = {};
      this.repo_queries = {};
      this.channel_queries = {};
      this.troupes = options.troupes;
      this.collection = new Backbone.Collection();
      this.collection.comparator = function(m) { return -m.get('people');};
      this.selectedIndex = 0;
      this.query = '';
      this.$input = options.$input;

      // listen for keypresses on the input
      var self = this;
      this.$input.on('keyup', function(e) {
        return self.keySearch(e);
      });
      appEvents.on('focus.request.search', function() {
        self.$input.focus();
        appEvents.trigger('focus.change.search');
      });
    },

    onKeySearchPrev: function(e) {
      this.selectPrev();
      e.preventDefault();
    },

    onKeySearchNext: function(e) {
      this.selectNext();
      e.preventDefault();
    },

    onKeySearchGo: function() {
      // this.navigateToCurrent();
      // this.$input.val('');
      // this.search('');
    },

    onKeySearchEscape: function() {
      this.$input.val('');
      this.search('');
    },

    // onKeyChatEscape: function() {
    //   if (this.query.length) this.$input.focus();
    // },

    search: function(query) {
      var self = this;

      if (query === '') {
        this.query = query;
        $(window).trigger('hideSearch');
        return;
      }
      // don't do anything if the search term hasn't changed
      if (query === this.query)
        return;
      else {
        this.query = query;
        $(window).trigger('showSearch');
      }

      var filter = textFilter({ query: query, fields: ['name', 'username', 'displayName', 'uri']});

      var troupes = this.troupes;

      // filter the local troupes collection
      var results = troupes.filter(filter);

      var additional = troupeCollections.orgs.filter(filter).filter(function(org) {
          return !results.some(function(existing) {
            return existing.get('uri') == org.get('name');
          });
        }).map(function(org) {
          var name = org.get('name');
          return new Backbone.Model({
            id: org.id,
            name: name,
            uri: name,
            url: '/' + name,
            githubType: 'ORG',
            ethereal: !org.room,
            people: org.room ? org.room.userCount : 0
          });
        });

      if(additional.length) results = results.concat(additional);

      // filter the suggestions from the user search service
      this.findUsers(query, function(suggestions) {
        var additional = suggestions.filter(function(user) {
            return !self.collection.findWhere({ url: '/' + user.username });
          }).map(function(user) {
            return new Backbone.Model({
              id: user.id,
              name: user.displayName,
              uri: user.username,
              url: '/' + user.username,
              oneToOne: true,
              githubType: 'ONETOONE',
              people: 1
            });
          });

          self.collection.set(additional, { remove: false, add: true, merge: true });
      });

      // filter the suggestions from the repo search service
      this.findRepos(query, function(suggestions) {
        var additional = suggestions.filter(function(repo) {
            return !self.collection.findWhere({ uri: repo.uri });
          }).map(function(repo) {
            return new Backbone.Model({
              id: repo.id,
              name: repo.uri,
              uri: repo.uri,
              url: '/' + repo.uri,
              githubType: 'REPO',
              ethereal: !repo.room,
              exists: repo.exists,
              people: repo.room ? repo.room.userCount : 0
            });
          });

        self.collection.set(additional, { remove: false, add: true, merge: true });

      });

      // filter the suggestions from the repo search service
      this.findPublicRepos(query, function(suggestions) {
        var additional = suggestions.filter(function(repo) {
            return !self.collection.findWhere({ uri: repo.uri });
          }).map(function(repo) {
            return new Backbone.Model({
              id: repo.id,
              name: repo.uri,
              uri: repo.uri,
              url: '/' + repo.uri,
              githubType: 'REPO',
              ethereal: !repo.room,
              exists: true,
              people: repo.room ? repo.room.users.length : 0
            });
          });

        self.collection.set(additional, { remove: false, add: true, merge: true });

      });

      // filter the suggestions from the channel search service
      this.findChannels(query, function(suggestions) {
        var additional = suggestions.filter(function(channel) {
            return !self.collection.findWhere({ uri: channel.uri });
          }).map(function(channel) {
            return new Backbone.Model({
              id: channel.id,
              name: channel.name,
              uri: channel.uri,
              url: channel.url,
              githubType: channel.githubType,
              ethereal: false,
              exists: true,
              people: channel.userCount
            });
          });

        self.collection.set(additional, { remove: false, add: true, merge: true });

      });

      // set the initial local search results
      self.collection.set(results, { remove: true, add: true, merge: true });

      self.select(0);
    },

    findUsers: function(query, callback) {
      var self = this;

      if (!query)
        return;

      // if we have done this query already, don't fetch it again (this could be problematic).
      if (this.user_queries[query]) {
        setTimeout(function() { callback(self.user_queries[query]); }, 0); // simulate async callback
        return;
      }

      // if a superset of this query was empty, so is this one
      var emptyPreviously = _.some(this.user_queries, function(v,k) {
        return query.toLowerCase().indexOf(k.toLowerCase()) === 0 && v.length === 0;
      });

      if (emptyPreviously) {
        setTimeout(function() { callback([]); }, 0);
        return;
      }

      apiClient.get('/v1/user', { q: query, type: 'gitter' })
        .then(function(data) {
          if(!data.results) return;

          if (!self.user_queries[query]) self.user_queries[query] = [];

          self.user_queries[query] = _.uniq(self.user_queries[query].concat(data.results), function(s) {
            return s.displayName;
          });

          callback(self.user_queries[query]);
        });
    },

    findRepos: function(query, callback) {
      var self = this;

      if (!query)
        return;

      // if we have done this query already, don't fetch it again (this could be problematic).
      if (this.repo_queries[query]) {
        setTimeout(function() { callback(self.repo_queries[query]); }, 0); // simulate async callback
        return;
      }

      // if a superset of this query was empty, so is this one
      var emptyPreviously = _.some(this.repo_queries, function(v,k) {
        return query.toLowerCase().indexOf(k.toLowerCase()) === 0 && v.length === 0;
      });

      if (emptyPreviously) {
        setTimeout(function() { callback([]); }, 0);
        return;
      }

      apiClient.user.get('/repos', { q: query })
        .then(function(data) {
          if(!data.results) return;
            if (!self.repo_queries[query]) self.repo_queries[query] = [];

            self.repo_queries[query] = _.uniq(self.repo_queries[query].concat(data.results), function(s) {
              return s.name;
            });

            callback(self.repo_queries[query]);
        });
    },

    findPublicRepos: function(query, callback) {
      var self = this;

      if (!query)
        return;

      // if we have done this query already, don't fetch it again (this could be problematic).
      if (this.repo_queries[query]) {
        setTimeout(function() { callback(self.repo_queries[query]); }, 0); // simulate async callback
        return;
      }

      // if a superset of this query was empty, so is this one
      var emptyPreviously = _.some(this.repo_queries, function(v,k) {
        return query.toLowerCase().indexOf(k.toLowerCase()) === 0 && v.length === 0;
      });

      if (emptyPreviously) {
        setTimeout(function() { callback([]); }, 0);
        return;
      }

      apiClient.get('/v1/public-repo-search', { q: query })
        .then(function(data) {
          if (!data.results) return;
          if (!self.repo_queries[query]) self.repo_queries[query] = [];

          self.repo_queries[query] = _.uniq(self.repo_queries[query].concat(data.results), function(s) {
            return s.name;
          });

          callback(self.repo_queries[query]);
        });
    },

    findChannels: function(query, callback) {
      var self = this;

      if (!query)
        return;

      // if we have done this query already, don't fetch it again (this could be problematic).
      if (this.channel_queries[query]) {
        setTimeout(function() { callback(self.channel_queries[query]); }, 0); // simulate async callback
        return;
      }

      // if a superset of this query was empty, so is this one
      var emptyPreviously = _.some(this.channel_queries, function(v,k) {
        return query.toLowerCase().indexOf(k.toLowerCase()) === 0 && v.length === 0;
      });

      if (emptyPreviously) {
        setTimeout(function() { callback([]); }, 0);
        return;
      }

      apiClient.get('/v1/channel-search', { q: query })
        .then(function(data) {
          if(!data.results) return;

          if (!self.channel_queries[query]) self.channel_queries[query] = [];

          self.channel_queries[query] = _.uniq(self.channel_queries[query].concat(data.results), function(s) {
            return s.name;
          });

          callback(self.channel_queries[query]);
        });
    },

    selectPrev: function() {
      this.select(this.selectedIndex - 1);
    },

    selectNext: function() {
      this.select(this.selectedIndex + 1);
    },

    navigateToCurrent: function() {
      var model = this.collection.at(this.selectedIndex);
      if(!model) return;

      if(model.get('exists') === false) {
        window.location.hash = '#confirm/' + model.get('uri');
      } else {
        appEvents.trigger('navigation', model.get('url'), 'chat', model.get('name'), model.id);
      }

    },

    select: function(i) {
      var itemElements = this.$el.find('li');

      if (i >= 0 && i < itemElements.length) {
        this.selectedIndex = i;
        itemElements.removeClass('selected');
        $(itemElements[this.selectedIndex]).addClass('selected');
      }
    },

    keySearch: _.debounce(function() {
      this.search(this.$input.val());
    }, 250)

  });

  cocktail.mixin(View, KeyboardEventsMixin);

  return View;


})();

