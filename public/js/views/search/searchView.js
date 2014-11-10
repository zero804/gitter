define([
  'jquery',
  'log!search-view',
  'components/apiClient',
  'utils/context',
  'utils/appevents',
  'utils/rollers',
  'backbone',
  'marionette',
  'underscore',
  'cocktail',
  'collections/instances/integrated-items',
  'collections/chat-search',
  'hbs!./tmpl/search',
  'hbs!./tmpl/result',
  'hbs!./tmpl/no-results',
  'hbs!./tmpl/no-room-results',
  'hbs!./tmpl/upgrade',
  'utils/text-filter',
  'views/keyboard-events-mixin',
  'views/behaviors/widgets', // No ref
  'views/behaviors/highlight' // No ref
], function ($, log, apiClient, context, appEvents, Rollers, Backbone, Marionette, _, cocktail,
  itemCollections, ChatSearchModels, searchTemplate, resultTemplate, noResultsTemplate, noRoomResultsTemplate,
  upgradeTemplate, textFilter, KeyboardEventsMixin) {
  "use strict";

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
      data.avatarUrl = 'https://avatars.githubusercontent.com/' + uri.split('/')[0] + '?s=50';
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

  var UpgradeView = ResultItemView.extend({
    className: 'result result-upgrade',
    template: upgradeTemplate,

    getOrgName: function(troupe) {
      if (troupe.get('oneToOne')) return false;
      return troupe.get('uri').split('/')[0];
    },

    serializeData: function() {
      var orgName = this.getOrgName(context.troupe());
      var billingUrl;
      if (!orgName) {
        billingUrl=context.env('billingUrl');
      } else {
        billingUrl=context.env('billingUrl') + "/orgs/" + orgName;
      }

      return {
        billingUrl: billingUrl,
        orgName: orgName
      };
    },

    selectItem: function () {
      // Do nothing for now.
    }
  });

  var MessageResultItemView = ResultItemView.extend({

    behaviors: {
      Widgets: {},
      Highlight: {}
    },

    serializeData: function () {
      var model = this.model;
      var fromUser = model.get('fromUser');
      var username = fromUser && fromUser.username || "";
      var sent = model.get('sent');

      return {
        selected: model.get('selected'),
        detail: username,
        sent: sent,
        text: model.get('text'),
        avatarUrl: fromUser && fromUser.avatarUrlSmall
      };
    },

    selectItem: function () {
      var id = this.model.get('id');

      // updating the collection around the message to be scrolled to
      itemCollections.chats.fetchAtPoint({ aroundId: id }, {}, function () {
        appEvents.trigger('chatCollectionView:selectedChat', id, { highlights: this.model.get('highlights') });
      }, this);
    }
  });

  var RoomsCollectionView = Marionette.CollectionView.extend({
    itemView: RoomResultItemView,

    emptyView: EmptyRoomResultsView,

    initialize: function () {
      var target = document.querySelector("#toolbar-content");
      this.rollers = new Rollers(target, this.el, { doNotTrack: true });
    },

    scrollTo: function (v) {
      this.rollers.scrollToElement(v.el, { centre: true });
    }
  });

  var MessagesCollectionView = Marionette.CollectionView.extend({
    emptyView: EmptyResultsView,

    initialize: function() {
      var target = document.querySelector("#toolbar-content");
      this.rollers = new Rollers(target, this.el, { doNotTrack: true });
    },

    getItemView: function (item) {

      if (item.get('limitReached')) {
        return UpgradeView;
      }

      return MessageResultItemView;
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
      if (index < collection.length - 1) this.swap(collection.at(index + 1 ));
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
      var p = $.Deferred();
      appEvents.triggerParent('troupeRequest', { }); // request troupe from parent frame
      appEvents.once('troupesResponse', p.resolve);
      return p;
    },

    fetchMessages: function (args) {
      var p = $.Deferred();
      var messages = this.messages;
      var query = args.query;

      messages.fetchSearch(query, function () {
        var results = messages.models
          .map(function (item) {
            item.set('priority', 3); // this ensures that messages are added at the bottom
            return item;
          });

          try {
            this.trigger('loaded:messages', results);
            p.resolve();
          } catch (e) {
            p.reject(e);
          }
      }.bind(this));

      return p;
    },

    fetchRooms: function (args) {
      var p = $.Deferred();
      var query = args.query;
      var limit = typeof args.limit === 'undefined' ? 3 : args.limit;

      var users = apiClient.get('/v1/user', { q: query, limit: limit, type: 'gitter' });
      var repos = apiClient.user.get('/repos', { q: query, limit: limit });
      var publicRepos = apiClient.get('/v1/rooms', { q: query, limit: limit });

      $.when(users, repos, publicRepos)
        .done(function (users, repos, publicRepos) {
          // FIXME: Explain why we are doing this??
          users[0].results.map(function (i) { i.exists = true; });
          publicRepos[0].results.map(function (i) { i.exists = true; });

          var results = [users, repos, publicRepos]
            .map(function (data) { return data[0].results; })
            .reduce(function (fold, arr) { return fold.concat(arr); }, [])
            .map(function (r) {
              if (!r) return;
              if (r.room) r.id = r.room.id; // use the room id as model id for repos
              r.url = r.url || '/' + r.uri;
              r.priority = 1;
              return new Backbone.Model(r);
            });

          try {
            this.trigger('loaded:rooms', results);
            p.resolve(results);
          } catch (e) {
            p.reject(e);
          }
        }.bind(this));

      return p;
    },

    formatRooms: function (rooms) {
      return rooms.filter(function (room) {
          return room.id !== context.getTroupeId();
        })
        .map(function (room) {
          room.exists = true;
          room.priority = room.githubType.match(/^ORG$/) ? 0 : 1;
          room.boost    = room.githubType.match(/^ORG$/) ? 1 : 0;
          return room;
        });
    },

    cacheRooms: function (rooms) {
      var cache = this.cache;
      cache.set(this.formatRooms(rooms));
      return $.Deferred().resolve(cache);
    },

    clearCache: function () {
      this.cache.reset();
    },

    getLocalRooms: function () {
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

    local: function (query) {
      var p = $.Deferred();
      if (!query) return; // to avoid fetching empty queries

      this.getLocalRooms()
        .then(function (rooms) {
          var filter = textFilter({ query: query, fields: ['url', 'name'] });
          rooms = rooms.filter(filter).slice(0, 3); // show the top 3 results only
          this.trigger('loaded:rooms', rooms);
          p.resolve();
        }.bind(this));
      return p;
    },

    remote: function (query) {
      var p = $.Deferred();
      $.when(
        this.fetchMessages({ query: query }),
        this.fetchRooms({ query: query })
      ).done(p.resolve);
      return p;
    }
  });

  var SearchView = Marionette.Layout.extend({
    template: searchTemplate,

    className: 'search',

    ui: {
      results: '.js-search-results',
      input: '.js-search-input',
      clearIcon: '.js-search-clear-icon',
      searchIcon: '.js-search-icon'
    },

    regions: {
      roomsRegion: '.js-search-rooms',
      messagesRegion: '.js-search-messages',
    },

    // the shortcuts need to be handled at the top level component
    keyboardEvents: {
      'focus.search': 'activate',
      'search.escape': 'dismiss',
      'search.prev': 'handlePrev',
      'search.next': 'handleNext',
      'search.go': 'handleGo'
    },

    // FIXME this redundant reference is a little strange?
    events: {
      'click .js-activate-search': 'activate',
      'click @ui.clearIcon' : 'clearSearchTerm',
      'click @ui.input': 'activate',
      'cut @ui.input': 'handleChange',
      'paste @ui.input': 'handleChange',
      'change @ui.input': 'handleChange',
      'input @ui.input': 'handleChange'
    },

    serializeData: function() {
      return {
        isOneToOne: context.troupe().get('oneToOne'),
        roomName: context.troupe().get('name')
      };
    },

    initialize: function () {
      var debouncedRun = _.debounce(this.run.bind(this), 100);

      this.model = new Backbone.Model({ searchTerm: '', active: false, isLoading: false });

      this.listenTo(this.model, 'change:isLoading', function (m, loading) {
        this.ui.searchIcon.toggleClass('fetching', loading);
      });

      this.listenTo(this.model, 'change:searchTerm', function () {
        if (this.isSearchTermEmpty()) {
          this.hide();
        } else {
          debouncedRun();
        }
      }.bind(this));

      this.listenTo(this.model, 'change:active', function (m, active) {
        this.$el.toggleClass('active', !!active);
      });

      // master collection to enable easier navigation
      var masterCollection = new Backbone.Collection([]);
      masterCollection.comparator = 'priority';

      // filtered collections
      this.rooms = new Backbone.FilteredCollection(null, { model: Backbone.Model, collection: masterCollection });
      this.chats = new Backbone.FilteredCollection(null, { model: Backbone.Model, collection: masterCollection });

      this.rooms.setFilter(function (model) {
        return !!model.get('url');
      });

      this.chats.setFilter(function (model) {
        return !!model.get('text');
      });

      // making navigation and filtered collections  accessible
      this.navigation = new NavigationController({ collection: masterCollection });
      this.search = new SearchController({});

      this.listenTo(this.search, 'loaded:rooms', function (data) {
        var result = this.rooms.models.concat(data);
        result = _.uniq(result, false, function (r) { return r.get('url'); });
        masterCollection.set(result, { remove: false });
      }.bind(this));

      this.listenTo(this.search, 'loaded:messages', function (data) {
        masterCollection.remove(this.chats.models);
        masterCollection.add(data, { remove: false });
      }.bind(this));

      // initialize the views
      this.roomsView = new RoomsCollectionView({ collection: this.rooms });
      this.messagesView = new MessagesCollectionView({ collection: this.chats });
      this.localSearch =  _.debounce(this.search.local.bind(this.search), 100);
      this.remoteSearch = _.debounce(this.search.remote.bind(this.search), 250);
    },

    isActive: function () {
      return this.model.get('active');
    },

    isSearchTermEmpty: function () {
      return _.isEmpty(this.model.get('searchTerm'));
    },

    clearSearchTerm: function () {
      this.hide();
      this.ui.input.val('');
      this.ui.input.focus();
    },

    // hides and clears search component's state
    dismiss: function () {
      var model = this.model;
      this.hide();
      this.triggerMethod('search:collapse');

      appEvents.triggerParent('menu:show'); // show menu
      appEvents.trigger('chatCollectionView:clearHighlight'); // remove highlights

      model.set('active', false);
      model.set('searchTerm', '');

      this.ui.input.val(function () { return ''; });
    },

    activate: function () {
      var model = this.model;
      model.set('active', true);
      this.triggerMethod('search:expand');

      if (window.innerWidth < 880) {
        appEvents.triggerParent('menu:hide'); // hide menu
      }

      if (this.isActive()) {
        var input = this.ui.input;
        if (input.is(':focus')) return;
        input.focus();
      } else {
        this.dismiss();
      }
    },

    hide: function () {
      this.triggerMethod('search:hide');
      this.ui.results.hide();
      this.search.clearCache();
    },

    run: function (/*model, searchTerm*/) {
      var searchTerm = this.model.get('searchTerm');

      this.model.set('isLoading', true);
      $.when(
          this.localSearch(searchTerm),
          this.remoteSearch(searchTerm)
        ).done(function () {
          this.model.set('isLoading', false);
        }.bind(this));

      this.showResults();
      this.triggerMethod('search:show'); // hide top toolbar content
    },

    showResults: function () {
      this.ui.results.show();
      this.roomsRegion.show(this.roomsView); // local rooms
      this.messagesRegion.show(this.messagesView); // server chat messages
    },

    handleChange: function (e) {
      e.preventDefault();
      this.model.set('searchTerm', e.target.value.trim());
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

    // FIXME: could this be done in a better way?
    scroll: function() {
      var mv = this.messagesView.children.findByModel(this.navigation.current());
      if (mv) this.messagesView.scrollTo(mv);
      var rv = this.roomsView.children.findByModel(this.navigation.current());
      if (rv) this.roomsView.scrollTo(rv);
    }
  });

  cocktail.mixin(SearchView, KeyboardEventsMixin);

  return SearchView;
});
