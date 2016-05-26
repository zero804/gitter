"use strict";

var apiClient = require('components/apiClient');
var context = require('utils/context');
var appEvents = require('utils/appevents');
var Rollers = require('utils/rollers');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var _ = require('underscore');
var cocktail = require('cocktail');
var ChatSearchModels = require('collections/chat-search');
var resultTemplate = require('./tmpl/result.hbs');
var noResultsTemplate = require('./tmpl/no-results.hbs');
var noRoomResultsTemplate = require('./tmpl/no-room-results.hbs');
var textFilter = require('utils/text-filter');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var Promise = require('bluebird');
var timeFormat = require('gitter-web-shared/time/time-format');
var fullTimeFormat = require('gitter-web-shared/time/full-time-format');
var FilteredCollection = require('backbone-filtered-collection');

require('views/behaviors/widgets');
require('views/behaviors/highlight');
require('views/behaviors/isomorphic');
require('views/behaviors/timeago');
require('views/behaviors/tooltip');

module.exports = (function() {

  var EmptyResultsView = Marionette.ItemView.extend({
    className: 'result-empty',
    template: noResultsTemplate
  });

  var EmptyRoomResultsView = Marionette.ItemView.extend({
    className: 'result-empty',
    events: {
      'click .js-create-room': 'showCreateRoomModal'
    },
    showCreateRoomModal: function() {
      parent.location.hash = '#createroom';
    },
    template: noRoomResultsTemplate
  });

  var ResultItemView = Marionette.ItemView.extend({

    events: {
      'click': 'handleSelect'
    },

    modelEvents: {
      'select': 'handleSelect', // this handles "enter"
      'change:selected': 'toggleSelected'
    },

    template: resultTemplate,

    className: 'result',

    initialize: function () {
      this.toggleSelected();
    },

    toggleSelected: function () {
      var selected = this.model.get('selected');
      this.$el.toggleClass('selected', !!selected);
    },

    handleSelect: function () {
      //tell the chat input view to focus
      appEvents.trigger('focus.request.chat');
      appEvents.trigger('track-event', 'search_result_selected');
      this.selectItem();
    }
  });

  var RoomResultItemView = ResultItemView.extend({

    serializeData: function () {
      var data = {};
      var uri = this.model.get('url').replace(/^\//,'');
      data.selected = this.model.get('selected');
      data.detail = this.model.get('githubType');
      data.text = uri;
      // TODO: send a room object
      data.avatarUrl = resolveRoomAvatarUrl({ uri: uri }, 48);
      return data;
    },

    selectItem: function () {
      if (this.model.get('exists')) {
        appEvents.trigger('navigation', this.model.get('url'), 'chat', this.model.get('uri'), null);
      } else {
        parent.location.hash = '#confirm/' + this.model.get('uri');
      }
    }
  });

  var MessageResultItemView = ResultItemView.extend({

    behaviors: {
      Widgets: {},
      Highlight: {},
      TimeAgo: {
        modelAttribute: 'sent',
        el: '#time'
      },
      Tooltip: {
        '#time': { titleFn: 'getSentTooltip', position: 'left' },
      }
    },

    serializeData: function () {
      var model = this.model;
      var fromUser = model.get('fromUser');
      var username = fromUser && fromUser.username || "";
      var sent = model.get('sent');
      var sentFormatted = timeFormat(sent, { compact: true });

      return {
        selected: model.get('selected'),
        detail: username,
        sent: sent,
        sentFormatted: sentFormatted,
        text: model.get('text'),
        avatarUrl: fromUser && fromUser.avatarUrlSmall
      };
    },

    selectItem: function () {
      var id = this.model.get('id');

      appEvents.trigger('chatCollectionView:loadAndHighlight', id, { highlights: this.model.get('highlights') });
    },

    getSentTooltip: function() {
      return fullTimeFormat(this.model.get('sent'));
    }
  });

  var RoomsCollectionView = Marionette.CollectionView.extend({
    childView: RoomResultItemView,
    emptyView: EmptyRoomResultsView,

    initialize: function (/*options*/) {
      var target = document.querySelector("#search-results");
      this.rollers = new Rollers(target, this.el, { doNotTrack: true });
    },

    scrollTo: function (v) {
      this.rollers.scrollToElement(v.el, { centre: true });
    }
  });

  var MessagesCollectionView = Marionette.CollectionView.extend({
    emptyView: EmptyResultsView,
    childView: MessageResultItemView,

    initialize: function() {
      var target = document.querySelector("#search-results");
      this.rollers = new Rollers(target, this.el, { doNotTrack: true });
    },

    scrollTo: function (v) {
      this.rollers.scrollToElement(v.el, { centre: true });
    }
  });

  // we need this to centralize the control of navigation, can take any collection :)
  var NavigationController = Marionette.Controller.extend({

    initialize: function (options) {
      this.collection = options.collection;
      this.listenTo(this.collection, 'add remove reset sync', this.reset); // bring cursor to top on every change to the collection
    },

    // unselects old and selects new
    swap: function (model) {
      if (!model) return;
      if (this.selected) this.selected.set('selected', false);
      model.set('selected', true);
      this.selected = model;
    },

    next: function () {
      var collection = this.collection;
      var index = collection.indexOf(this.selected);
      if (index < collection.length - 1) this.swap(collection.at(index + 1));
    },

    prev: function () {
      var collection = this.collection;
      var index = collection.indexOf(this.selected);
      if (index > 0) this.swap(collection.at(index - 1));
    },

    current: function () {
      return this.selected;
    },

    reset: function () {
      this.swap(this.collection.at(0));
    }
  });

  var SearchController = Marionette.Controller.extend({

    initialize: function () {
      this.cache = new Backbone.Collection([]);
      this.messages = new ChatSearchModels.ChatSearchCollection([], { });
      this.cache.comparator = function (item) {
        return -(item.get('boost') + Date.parse(item.get('lastAccessTime')).toString());
      };
    },

    fetchLocalRooms: function () {
      return new Promise(function(resolve) {
        appEvents.triggerParent('troupeRequest', { }); // request troupe from parent frame
        appEvents.once('troupesResponse', resolve);
      });
    },

    fetchMessages: function (args) {
      var messages = this.messages;
      var query = args.query;
      var self = this;

      messages.reset(); // we must clear the collection before fetching more
      return new Promise(function(resolve, reject) {
        messages.fetchSearch(query, function (err) {
          if (err) {
            appEvents.trigger('track-event', 'search_messages_failed');
            return reject(err);
          }

          var results = messages.models
            .map(function (item) {
              item.set('priority', 3); // this ensures that messages are added at the bottom
              return item;
            });

          self.trigger('loaded:messages', results, query);
          resolve();
        }, this);
      });
    },

    fetchRooms: function (args) {
      var query = args.query;
      var limit = typeof args.limit === 'undefined' ? 3 : args.limit;

      return Promise.all([
          apiClient.get('/v1/user', { q: query, limit: limit, type: 'gitter' }),
          apiClient.user.get('/repos', { q: query, limit: limit }),
          apiClient.get('/v1/rooms', { q: query, limit: limit })
        ])
        .bind(this)
        .spread(function (users, repos, publicRepos) {
          // assuring that object are uniform since repos have a boolean (exists)
          users.results.map(function (i) { i.exists = true; });
          publicRepos.results.map(function (i) { i.exists = true; });

          var results = [users.results, repos.results, publicRepos.results]
            .reduce(function (fold, arr) { return fold.concat(arr); }, [])
            .map(function (r) {
              if (!r) return;
              if (r.room) r.id = r.room.id; // use the room id as model id for repos
              r.url = r.url || '/' + r.uri;
              r.priority = 1;
              r.query = query;
              return new Backbone.Model(r);
            })
            .filter(this.notCurrentRoom);

          this.trigger('loaded:rooms', results, query);
          return results;
        })
        .catch(function (err) {
          appEvents.trigger('track-event', 'search_rooms_failed');
          throw err;
        });
    },

    notCurrentRoom: function (room) {
      return room.id !== context.getTroupeId();
    },

    formatRooms: function (rooms) {
      return rooms.filter(this.notCurrentRoom)
        .map(function (room) {
          room.exists = true;
          room.priority = room.githubType.match(/^ORG$/) ? 0 : 1;
          room.boost = room.githubType.match(/^ORG$/) ? 1 : 0;
          return room;
        });
    },

    cacheRooms: function (rooms) {
      var cache = this.cache;
      cache.set(this.formatRooms(rooms));
      return Promise.resolve(cache);
    },

    clearCache: function () {
      this.cache.reset();
      this.trigger('cache:clear', {});
    },

    getLocalRooms: function () {
      var cache = this.cache;

      if (_.isEmpty(cache.models)) {
        return this.fetchLocalRooms()
          .then(this.cacheRooms.bind(this));
      }

      return Promise.resolve(cache);
    },

    local: function (query) {
      if (!query) {
        return Promise.resolve(); // to avoid fetching empty queries
      }

      return this.getLocalRooms()
        .bind(this)
        .then(function (rooms) {
          var filter = textFilter({ query: query, fields: ['url', 'name'] });
          rooms = rooms.filter(filter).slice(0, 3).map(function (item) {
            item.set('query', query);
            return item;
          }); // show the top 3 results only

          this.trigger('loaded:rooms', rooms, query);
        });
    },

    remote: function (query) {
      if (!query) {
        return Promise.resolve(); // to avoid fetching empty queries
      }

      return Promise.all([
        this.fetchMessages({ query: query }),
        this.fetchRooms({ query: query })
      ]);
    }
  });

  var SearchView = Marionette.LayoutView.extend({
    // template: searchTemplate, SearchView is prerendered
    behaviors: {
      Isomorphic: {
        roomsRegion: { el: '.js-search-rooms', init: 'initRoomsRegion' },
        messagesRegion: { el: '.js-search-messages', init: 'initMessagesRegion' },
      }
    },

    // the shortcuts need to be handled at the top level component
    keyboardEvents: {
      'focus.search': 'activate',
      'search.escape': 'onEscape',
      'search.prev': 'handlePrev',
      'search.next': 'handleNext',
      'search.go': 'handleGo'
    },

    serializeData: function() {
      return {
        isOneToOne: context.troupe().get('oneToOne'),
        troupeName: context.troupe().get('name')
      };
    },

    initialize: function () {
      var debouncedRun = _.debounce(this.run.bind(this), 250);

      this.listenTo(this.model, 'change:searchTerm', function () {
        debouncedRun();
      });

      this.listenTo(this.model, 'change:active', function (m, active) {  // jshint unused:true
        if (active) {
          this.triggerMethod('search:expand');

          if (window.innerWidth < 880) {
            appEvents.triggerParent('menu:hide'); // hide menu
          }
        } else {
          this.model.set('searchTerm', '');
          this.hide();
          this.triggerMethod('search:collapse');

          appEvents.triggerParent('menu:show'); // show menu
          appEvents.trigger('chatCollectionView:clearHighlight'); // remove highlights
        }

      });

      // master collection to enable easier navigation
      var masterCollection = new Backbone.Collection([]);
      masterCollection.comparator = 'priority';

      // filtered collections
      this.rooms = new FilteredCollection({ model: Backbone.Model, collection: masterCollection });
      this.chats = new FilteredCollection({ model: Backbone.Model, collection: masterCollection });

      this.rooms.setFilter(function (model) {
        return !!model.get('url');
      });

      this.chats.setFilter(function (model) {
        return !!model.get('text');
      });

      // making navigation and filtered collections accessible
      this.navigation = new NavigationController({ collection: masterCollection });
      this.search = new SearchController({});

      this.listenTo(this.search, 'cache:clear', function () {
        masterCollection.reset();
      });

      this.listenTo(this.search, 'loaded:rooms', function (data) {
        var toRemove = this.rooms.models.filter(function (item) {
          return item.get('query') !== this.model.get('searchTerm');
        }, this);

        masterCollection.remove(toRemove);
        masterCollection.add(data);
        this.rooms.switchCollection(masterCollection);
      });

      this.listenTo(this.search, 'loaded:messages', function (data) {
        masterCollection.remove(this.chats.models); // we must remove the old chats before adding new ones
        masterCollection.set(data, { remove: false });
        this.chats.switchCollection(masterCollection);
      });

      this.listenTo(context.troupe(), 'change:id', function() {
        masterCollection.reset();
        this.model.set('active', false);
        //Super hacky implementation as this will be moved
        //JP 4/11/15
        this.$el.find('.js-troupe-name')[0].innerHTML = context.troupe().get('name');
      });

    },

    initRoomsRegion: function(optionsForRegion) {
      return new RoomsCollectionView(optionsForRegion({ collection: this.rooms }));
    },

    initMessagesRegion: function(optionsForRegion) {
      return new MessagesCollectionView(optionsForRegion({ collection: this.chats }));
    },

    isSearchTermEmpty: function () {
      return _.isEmpty(this.model.get('searchTerm'));
    },

    activate: function () {
      this.model.set('active', true);
    },

    onEscape: function () {
      this.model.set('active', false);
    },

    hide: function () {
      this.triggerMethod('search:hide');
      this.search.clearCache();
    },

    run: function (/*model, searchTerm*/) {
      if (this.isSearchTermEmpty()) return this.hide();

      var searchTerm = this.model.get('searchTerm');
      this.model.set('isLoading', true);

      Promise.all([
        this.search.local(searchTerm),
        this.search.remote(searchTerm)
      ])
      .bind(this)
      .finally(function() {
        this.model.set('isLoading', false);
        appEvents.trigger('track-event', 'search_complete');
      });

      this.triggerMethod('search:show'); // hide top toolbar content
    },

    handlePrev: function (e) {
      e.preventDefault();
      if (this.isSearchTermEmpty()) return;
      this.navigation.prev();
      this.scroll();
    },

    handleNext: function (e) {
      e.preventDefault();
      if (this.isSearchTermEmpty()) return;
      this.navigation.next();
      this.scroll();
    },

    handleGo: function () {
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
    }
  });

  cocktail.mixin(SearchView, KeyboardEventsMixin);

  return SearchView;

})();
