'use strict';

var $                     = require('jquery');
var _                     = require('underscore');
var Backbone              = require('backbone');
var Marionette            = require('backbone.marionette');
var cocktail              = require('cocktail');

var apiClient             = require('components/apiClient');
var context               = require('utils/context');
var appEvents             = require('utils/appevents');
var Rollers               = require('utils/rollers');

//OOPS TODO use this lovely thing @leroux made.
var resolveRoomAvatarUrl  = require('gitter-web-shared/avatars/resolve-room-avatar-url');
var getRoomAvatar = require('utils/get-room-avatar');

var textFilter            = require('utils/text-filter');
var KeyboardEventsMixin   = require('views/keyboard-events-mixin');
var ChatSearchModels      = require('collections/chat-search');

var resultTemplate        = require('./search-results-item.hbs');
var noResultsTemplate     = require('./search-results-empty.hbs');
var noRoomResultsTemplate = require('./search-results-rooms-empty.hbs');

require('views/behaviors/widgets');
require('views/behaviors/highlight');
require('views/behaviors/isomorphic');

module.exports = (function() {

  var EmptyResultsView = Marionette.ItemView.extend({
    className: 'result-empty',
    template: noResultsTemplate,
  });

  var EmptyRoomResultsView = Marionette.ItemView.extend({
    className: 'result-empty',
    events: {
      'click .js-create-room': 'showCreateRoomModal',
    },
    showCreateRoomModal: function() {
      parent.location.hash = '#createroom';
    },

    template: noRoomResultsTemplate,
  });

  var ResultItemView = Marionette.ItemView.extend({

    events: {
      'click': 'handleSelect',
    },

    modelEvents: {
      'select': 'handleSelect', // this handles "enter"
      'change:selected': 'toggleSelected',
    },

    template: resultTemplate,

    className: 'room-item--search',

    initialize: function() {
      this.toggleSelected();
    },

    toggleSelected: function() {
      var selected = this.model.get('selected');
      this.$el.toggleClass('selected', !!selected);
    },

    handleSelect: function() {
      //tell the chat input view to focus
      appEvents.trigger('focus.request.chat');
      appEvents.trigger('track-event', 'search_result_selected');

      //We have to wait to select an item here
      //as the menu needs to animate out
      setTimeout(function() {
        this.selectItem();
      }.bind(this), 300);
    },
  });

  var RoomResultItemView = ResultItemView.extend({

    serializeData: function() {
      var data = this.model.toJSON();
      return {
        name:          data.name,
        roomAvatarUrl: getRoomAvatar(data.name),
      };
    },

    selectItem: function() {
      if (this.model.get('exists')) {
        appEvents.trigger('navigation', this.model.get('url'), 'chat', this.model.get('uri'), null);
      } else {
        parent.location.hash = '#confirm/' + this.model.get('uri');
      }
    },
  });

  var MessageResultItemView = ResultItemView.extend({

    behaviors: {
      Widgets: {},
      Highlight: {},
    },

    serializeData: function() {
      var model = this.model;
      var fromUser = model.get('fromUser');
      var username = fromUser && fromUser.username || '';

      //var sent = model.get('sent');

      /*
      return {
        selected: model.get('selected'),
        detail: username,
        sent: sent,
        text: model.get('text'),
        avatarUrl: fromUser && fromUser.avatarUrlSmall
      };
      */

      return {
        name: model.get('text'),
        roomAvatarUrl: getRoomAvatar(username),
      };
    },

    //TODO FIGURE OUT WHY THIS DOESN'T WORK JP 15/12/15
    selectItem: function() {
      var id = this.model.get('id');
      appEvents.trigger('chatCollectionView:loadAndHighlight', id, { highlights: this.model.get('highlights') });
    },
  });

  var RoomsCollectionView = Marionette.CollectionView.extend({
    childView: RoomResultItemView,
    emptyView: EmptyRoomResultsView,

    initialize: function(/*options*/) {
      var target = document.querySelector('#search-results');
      this.rollers = new Rollers(target, this.el, { doNotTrack: true });
    },

    scrollTo: function(v) {
      this.rollers.scrollToElement(v.el, { centre: true });
    },
  });

  var MessagesCollectionView = Marionette.CollectionView.extend({
    emptyView: EmptyResultsView,
    childView: MessageResultItemView,

    initialize: function() {
      var target = document.querySelector('#search-results');
      this.rollers = new Rollers(target, this.el, { doNotTrack: true });
    },

    scrollTo: function(v) {
      this.rollers.scrollToElement(v.el, { centre: true });
    },
  });

  // we need this to centralize the control of navigation, can take any collection :)
  var NavigationController = Marionette.Controller.extend({

    initialize: function(options) {
      this.collection = options.collection;
      this.listenTo(this.collection, 'add remove reset sync', this.reset); // bring cursor to top on every change to the collection
    },

    // unselects old and selects new
    swap: function(model) {
      if (!model) return;
      if (this.selected) this.selected.set('selected', false);
      model.set('selected', true);
      this.selected = model;
    },

    next: function() {
      var collection = this.collection;
      var index = collection.indexOf(this.selected);
      if (index < collection.length - 1) this.swap(collection.at(index + 1));
    },

    prev: function() {
      var collection = this.collection;
      var index = collection.indexOf(this.selected);
      if (index > 0) this.swap(collection.at(index - 1));
    },

    current: function() {
      return this.selected;
    },

    reset: function() {
      this.swap(this.collection.at(0));
    },
  });

  var SearchController = Marionette.Controller.extend({

    initialize: function() {
      this.cache = new Backbone.Collection([]);
      this.messages = new ChatSearchModels.ChatSearchCollection([], { });
      this.cache.comparator = function(item) {
        return -(item.get('boost') + Date.parse(item.get('lastAccessTime')).toString());
      };
    },

    fetchLocalRooms: function() {
      var p = $.Deferred();
      appEvents.triggerParent('troupeRequest', { }); // request troupe from parent frame
      appEvents.once('troupesResponse', p.resolve);
      return p;
    },

    fetchMessages: function(args) {
      var p = $.Deferred();
      var messages = this.messages;
      var query = args.query;
      var self = this;

      messages.reset(); // we must clear the collection before fetching more
      messages.fetchSearch(query, function(err) {
        if (err) {
          appEvents.trigger('track-event', 'search_messages_failed');
          return p.reject(err);
        }

        var results = messages.models
          .map(function(item) {
            item.set('priority', 3); // this ensures that messages are added at the bottom
            return item;
          });

        self.trigger('loaded:messages', results, query);
        p.resolve();
      }, this);

      return p;
    },

    fetchRooms: function(args) {
      var p = $.Deferred();
      var query = args.query;
      var limit = typeof args.limit === 'undefined' ? 3 : args.limit;

      var users = apiClient.get('/v1/user', { q: query, limit: limit, type: 'gitter' });
      var repos = apiClient.user.get('/repos', { q: query, limit: limit });
      var publicRepos = apiClient.get('/v1/rooms', { q: query, limit: limit });

      $.when(users, repos, publicRepos)
        .done(function(users, repos, publicRepos) {
          // assuring that object are uniform since repos have a boolean (exists)
          users[0].results.map(function(i) { i.exists = true; });

          publicRepos[0].results.map(function(i) { i.exists = true; });

          var results = [users, repos, publicRepos]
            .map(function(data) { return data[0].results; })
            .reduce(function(fold, arr) { return fold.concat(arr); }, [])
            .map(function(r) {
              if (!r) return;
              if (r.room) r.id = r.room.id; // use the room id as model id for repos
              r.url = r.url || '/' + r.uri;
              r.priority = 1;
              r.query = query;
              return new Backbone.Model(r);
            })
            .filter(this.notCurrentRoom);

          this.trigger('loaded:rooms', results, query);
          p.resolve(results);
        }.bind(this))
        .fail(function(err) {
          appEvents.trigger('track-event', 'search_rooms_failed');
          p.reject(err);
        });

      return p;
    },

    notCurrentRoom: function(room) {
      return room.id !== context.getTroupeId();
    },

    formatRooms: function(rooms) {
      return rooms.filter(this.notCurrentRoom)
        .map(function(room) {
          room.exists = true;
          room.priority = room.githubType.match(/^ORG$/) ? 0 : 1;
          room.boost    = room.githubType.match(/^ORG$/) ? 1 : 0;
          return room;
        });
    },

    cacheRooms: function(rooms) {
      var cache = this.cache;
      cache.set(this.formatRooms(rooms));
      return $.Deferred().resolve(cache);
    },

    clearCache: function() {
      this.cache.reset();
      this.trigger('cache:clear', {});
    },

    getLocalRooms: function() {
      var p = $.Deferred();
      var cache = this.cache;

      if (_.isEmpty(cache.models)) {
        this.fetchLocalRooms()
          .then(this.cacheRooms.bind(this))
          .then(p.resolve);
      } else {
        p.resolve(cache);
      }

      return p;
    },

    local: function(query) {
      var p = $.Deferred();

      if (!query) {
        return p.resolve(); // to avoid fetching empty queries
      }

      this.getLocalRooms()
        .then(function(rooms) {
          var filter = textFilter({ query: query, fields: ['url', 'name'] });
          rooms = rooms.filter(filter).slice(0, 3).map(function(item) {
            item.set('query', query);
            return item;
          }); // show the top 3 results only

          this.trigger('loaded:rooms', rooms, query);
          p.resolve();
        }.bind(this));
      return p;
    },

    remote: function(query) {
      var p = $.Deferred();

      if (!query) {
        return p.resolve(); // to avoid fetching empty queries
      }

      $.when(this.fetchMessages({ query: query }), this.fetchRooms({ query: query }))
        .done(p.resolve)
        .fail(p.reject);
      return p;
    },
  });

  var SearchView = Marionette.LayoutView.extend({
    // template: searchTemplate, SearchView is prerendered
    behaviors: {
      Isomorphic: {
        roomsRegion: { el: '.js-search-rooms', init: 'initRoomsRegion' },
        messagesRegion: { el: '.js-search-messages', init: 'initMessagesRegion' },
      },
    },

    // the shortcuts need to be handled at the top level component
    keyboardEvents: {
      'focus.search': 'activate',
      'search.escape': 'onEscape',
      'search.prev': 'handlePrev',
      'search.next': 'handleNext',
      'search.go': 'handleGo',
    },

    serializeData: function() {
      return {
        isOneToOne: context.troupe().get('oneToOne'),
        troupeName: context.troupe().get('name'),
      };
    },

    initialize: function() {

      this.$el.hide();

      var debouncedRun = _.debounce(this.run.bind(this), 250);

      this.listenTo(this.model, 'change:searchTerm', function(model, val) {

        if (val === '') {
          return this.$el.hide();
        }

        if (model.get('state') !== 'search') {
          return this.$el.hide();
        }

        this.$el.show();
        debouncedRun();
      });

      this.listenTo(this.model, 'change:state', this.onModelChangeState, this);

      //trigger this initially so we can hide the search view on init
      this.onModelChangeState(this.model, this.model.get('state'));

      // master collection to enable easier navigation
      var masterCollection = new Backbone.Collection([]);
      masterCollection.comparator = 'priority';

      // filtered collections
      this.rooms = new Backbone.FilteredCollection(null, { model: Backbone.Model, collection: masterCollection });
      this.chats = new Backbone.FilteredCollection(null, { model: Backbone.Model, collection: masterCollection });

      this.rooms.setFilter(function(model) {
        return !!model.get('url');
      });

      this.chats.setFilter(function(model) {
        return !!model.get('text');
      });

      // making navigation and filtered collections accessible
      this.navigation = new NavigationController({ collection: masterCollection });
      this.search = new SearchController({});

      this.listenTo(this.search, 'cache:clear', function() {
        masterCollection.reset();
      });

      this.listenTo(this.search, 'loaded:rooms', function(data) {
        var toRemove = this.rooms.models.filter(function(item) {
          return item.get('query') !== this.model.get('searchTerm');
        }, this);

        masterCollection.remove(toRemove);
        masterCollection.add(data);
        this.rooms.resetWith(masterCollection);
      });

      this.listenTo(this.search, 'loaded:messages', function(data) {
        masterCollection.remove(this.chats.models); // we must remove the old chats before adding new ones
        masterCollection.set(data, { remove: false });
        this.chats.resetWith(masterCollection);
      });

      this.listenTo(context.troupe(), 'change:id', function() {
        masterCollection.reset();

        //this.model.set('active', false);
        //Super hacky implementation as this will be moved
        //JP 4/11/15
        //this.$el.find('.js-troupe-name')[0].innerHTML = context.troupe().get('name');
      });

    },

    initRoomsRegion: function(optionsForRegion) {
      return new RoomsCollectionView(optionsForRegion({ collection: this.rooms }));
    },

    initMessagesRegion: function(optionsForRegion) {
      return new MessagesCollectionView(optionsForRegion({ collection: this.chats }));
    },

    isSearchTermEmpty: function() {
      return _.isEmpty(this.model.get('searchTerm'));
    },

    activate: function() {
      this.model.set('active', true);
    },

    onEscape: function() {
      this.model.set('active', false);
    },

    onModelChangeState: function(model, val) {
      if (val === 'search' && model.get('searchTerm') !== '') {
        return this.$el.show();
      }

      this.$el.hide();
    },

    hide: function() {
      this.triggerMethod('search:hide');
      this.search.clearCache();
    },

    run: function(/*model, searchTerm*/) {
      if (this.isSearchTermEmpty()) return this.hide();

      var searchTerm = this.model.get('searchTerm');
      var finishedLoading = function() {
        this.model.set('isLoading', false);
        appEvents.trigger('track-event', 'search_complete');
      }.bind(this);

      this.model.set('isLoading', true);

      $.when(this.search.local(searchTerm), this.search.remote(searchTerm))
        .then(finishedLoading)
        .fail(finishedLoading);

      this.triggerMethod('search:show'); // hide top toolbar content
    },

    handlePrev: function(e) {
      e.preventDefault();
      if (this.isSearchTermEmpty()) return;
      this.navigation.prev();
      this.scroll();
    },

    handleNext: function(e) {
      e.preventDefault();
      if (this.isSearchTermEmpty()) return;
      this.navigation.next();
      this.scroll();
    },

    handleGo: function() {
      if (this.isSearchTermEmpty()) return;
      var item = this.navigation.current();
      if (item) item.trigger('select');
    },

    scroll: function() {
      //FIXME JP 26/8/15
      //https://github.com/troupe/gitter-webapp/issues/517

      /*
      var mv = this.messagesView.children.findByModel(this.navigation.current());
      if (mv) this.messagesView.scrollTo(mv);
      var rv = this.roomsView.children.findByModel(this.navigation.current());
      if (rv) this.roomsView.scrollTo(rv);
      */
    },
  });

  cocktail.mixin(SearchView, KeyboardEventsMixin);

  return SearchView;

})();
