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

    toggleSelected: function() {
      var selected = this.model.get('selected');
      this.$el.toggleClass('selected', !!selected);
      if (selected) { /* FIXME longer lists, do we need to scroll m into view?; */ }
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
      if(this.model.get('exists')) {
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

    initialize: function() {
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
      this.rollers = new Rollers(target, this.el, {doNotTrack: true});
    },

    getItemView: function(item) {
      if(item.get('limitReached')) {
        return UpgradeView;
      }

      return MessageResultItemView;
    },

    scrollTo: function(v) {
      this.rollers.scrollToElement(v.el, {centre: true});
    }
  });

  // we need this to centralize the control of navigation, can take any collection :)
  var NavigationController = Marionette.Controller.extend({

    initialize: function (options) {
      this.collection = options.collection;
      // this ensures the first result is selected
      this.listenTo(this.collection, 'add remove reset sync', this.reset);
    },

    // unselects old and selects new
    swap: function (model) {

      if (!model) return;
      if (this.selected) this.selected.set('selected', false);
      model.set('selected', true);
      this.selected = model;
    },

    next: function () {
      var index = this.collection.indexOf(this.selected);
      if (index < this.collection.length - 1) this.swap(this.collection.at(index + 1 ));
    },

    prev: function () {
      var index = this.collection.indexOf(this.selected);
      if (index > 0) this.swap(this.collection.at(index - 1));
    },

    current: function () {
      return this.selected;
    },

    reset: function () {
      // //debug('NavigationController:reset() ====================');
      this.swap(this.collection.at(0));
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
      'click @ui.clearIcon' : 'clearSearch',
      'click @ui.input': 'activate',
      'cut @ui.input': 'handleChange',
      'paste @ui.input': 'handleChange',
      'change @ui.input': 'handleChange',
      'input @ui.input': 'handleChange'
    },

    onRender: function() {
    },



    serializeData: function() {
      return {
        isOneToOne: context.troupe().get('oneToOne'),
        roomName: context.troupe().get('name')
      };
    },

    initialize: function () {
      var debouncedRun = _.debounce(this.run.bind(this), 100);

      this.model = new Backbone.Model({ searchTerm: '', active: false, fetchingCount: 0 });

      this.listenTo(this.model, 'change:fetchingCount', function (m, count) {
        var isFetching = (count !== 0);
        if (!isFetching) {
          // loaded
          this.ui.searchIcon.toggleClass('fetching', isFetching);
        } else {
          // still fetching
          this.ui.searchIcon.toggleClass('fetching', isFetching);
        }
      });

      this.listenTo(this.model, 'change:searchTerm', function () {
        if (this.isEmpty()) {
          this.hide();
        } else {
          debouncedRun();
        }
      }.bind(this));

      this.listenTo(this.model, 'change:active', function (m, active) {
        this.$el.toggleClass('active', !!active);
      });

      // master collection to enable easier navigation
      this.collection = new Backbone.Collection([]);
      this.collection.comparator = 'priority';

      // filtered collections
      var rooms = new Backbone.FilteredCollection(null, { model: Backbone.Model, collection: this.collection });
      var chats = new Backbone.FilteredCollection(null, { model: Backbone.Model, collection: this.collection });

      rooms.setFilter(function (model) {
        return !!model.get('url');
      });

      chats.setFilter(function (model) {
        return !!model.get('text');
      });

      this.localRoomsCache = null;
      this.rooms = rooms;
      this.chats = chats;

      // making navigation and filtered collections  accessible
      this.navigation = new NavigationController({ collection: this.collection });

      // initialize the views
      this.localRoomsView = new RoomsCollectionView({ collection: rooms });
      this.serverMessagesView = new MessagesCollectionView({ collection: chats });
      this.debouncedLocalSearch =  _.debounce(this.localSearch.bind(this), 100);
      this.debouncedRemoteSearch = _.debounce(this.remoteSearch.bind(this), 300);
    },

    isActive: function () {
      return this.model.get('active');
    },

    isEmpty: function () {
      return !this.model.get('searchTerm');
    },

    // completes hides and clears search state
    dismiss: function () {
      var model = this.model;

      this.triggerMethod('search:collapse');
      appEvents.triggerParent('menu:show'); // hide menu
      appEvents.trigger('chatCollectionView:clearHighlight'); // remove highlights;

      model.set('active', false);
      model.set('searchTerm', '');

      this.ui.input.val(function () { return ''; });
      this.hide();
    },

    activate: function () {

      var model = this.model;
      model.set('active', true);

      var innerWidth = window.innerWidth;

      this.triggerMethod('search:expand');

      if (innerWidth < 880) {
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
      this.collection.reset();
      this.clearLocalRooms();
    },

    run: function (/*model, searchTerm*/) {
      if (!this.localRoomsCache) this.getLocalRooms();
      this.debouncedLocalSearch();
      this.debouncedRemoteSearch();
      this.showResults();
      this.triggerMethod('search:show');
    },

    incrementFetchingCount: function () {
      var m = this.model;
      var count = m.get('fetchingCount');
      m.set('fetchingCount', count + 1);
    },

    decrementFetchingCount: function () {
      var m = this.model;
      var count = m.get('fetchingCount');
      m.set('fetchingCount', count - 1);
    },

    /*
     * filteredCollection - the collection we are updating
     * newModels          - the new models to be added
     * options            - same options as Backbone.Collection.add
     */
    refreshCollection: function (filteredCollection, newModels, options) {
      var getId = function (item) { return item.id };

      // if the new models are the same as the current filtered collection avoids flickering by returning
      if (_.isEqual(newModels.map(getId), filteredCollection.map(getId))) return;
      if (this.searchTermOutdated(options.query)) { return; }

      options = options || {};
      var collection = this.collection;

      if (options.nonDestructive) {
        var all = filteredCollection.models.concat(newModels);
        newModels = _.uniq(all, false, function (r) { return r.get('url'); });
        delete options.nonDestructive; // remove it from our options object
      }

      collection.remove(filteredCollection.models);
      collection.add(newModels, options);
      filteredCollection.resetWith(collection);
    },

    // may need some thought in the future
    clearLocalRooms: function () {
      this.localRoomsCache = null;
    },

    // handles the response from the parent frame containing local rooms
    cacheLocalRooms: function (rooms) {
      var collection = new Backbone.Collection();

      var filtered = rooms.filter(function (room) {
          return room.id !== context.getTroupeId();
        })
        .map(function (room) {
          room.exists = true;
          room.priority = room.githubType.match(/^ORG$/) ? 0 : 1;
          room.boost    = room.githubType.match(/^ORG$/) ? 1 : 0;
          return room;
        });

      collection.comparator = function(item) {
        return -(item.get('boost') + Date.parse(item.get('lastAccessTime')).toString());
      };

      collection.add(filtered);

      this.localRoomsCache = collection;
    },

    // FIXME: this should probably return a promise...
    // responsible for handling local rooms cache
    getLocalRooms: function () {
      // request troupe from parent frame
      appEvents.triggerParent('troupeRequest', { });
      // once the response comes back lets cache it!
      appEvents.once('troupesResponse', this.cacheLocalRooms.bind(this));
    },

    localSearch: function () {
      var query = this.model.get('searchTerm');
      // the count for local search has already been incremented on run()
      var collection = this.localRoomsCache || [];
      var filter = textFilter({ query: query, fields: ['url', 'name'] });
      var results = collection.filter(filter);

      // show the top 3 results only
      results = results.slice(0, 3);

      try {
        this.refreshCollection(this.rooms, results, { at: this.collection.length, merge: true, query: query });
      } catch (e) {
        log(new Error('Could not perform local search.').stack);
        this.getLocalRooms(); // try and replace the cache
      }
    },

    remoteSearch: function() {
      this.model.set('fetchingCount', 0); // TODO: this could save our asses?
      var query = this.model.get('searchTerm');
      if (!query) return; // to avoid fetching empty queries

      // Find messages on ElasticSearch
      var chatSearchCollection = new ChatSearchModels.ChatSearchCollection([], { });
      this.incrementFetchingCount();
      chatSearchCollection.fetchSearch(query, function () {
        var results = chatSearchCollection.models.map(function (item) {
          item.set('priority', 3);
          return item;
        });

        try {
          this.refreshCollection(this.chats, results, { query: query });
        } catch (e) {
          log(new Error('Could not perform remote search.').stack);
        } finally {
          this.decrementFetchingCount();
        }
      }.bind(this), this);

      // Find users, repos and channels on the server
      var self = this;
      var limit = 3;

      this.incrementFetchingCount();
      var users = apiClient.get('/v1/user',                     { q: query, limit: limit, type: 'gitter' });
      var repos = apiClient.user.get('/repos',                  { q: query, limit: limit});
      var publicRepos = apiClient.get('/v1/rooms',              { q: query, limit: limit});

      // TODO: u, r, pr. WTF!? Change the names at some point.
      $.when(users, repos, publicRepos)
        .done(function (u, r, pr) {

          u[0].results.map(function(i) { i.exists = true; });
          pr[0].results.map(function(i) { i.exists = true; });

          var results =  [u, r, pr]
            .map(function (data) { return data[0].results; })
            .reduce(function (fold, arr) { return fold.concat(arr); }, []);

          var _results = results.map(function (r) {
            if (!r) return;
            if (r.room) r.id = r.room.id; // use the room id as model id for repos
            r.url = r.url || '/' + r.uri;
            r.priority = 1;
            return new Backbone.Model(r);
          });
          self.decrementFetchingCount();
          self.refreshCollection(self.rooms, _.compact(_results), { nonDestructive: true, query: query });
        });
    },

    showResults: function () {
      this.ui.results.show();
      this.roomsRegion.show(this.localRoomsView); // local rooms
      this.messagesRegion.show(this.serverMessagesView); // server chat messages
    },

    clearSearch: function () {
      // this could probably be done in a more elgant way - sorry MB
      this.hide();
      this.ui.input.val('');
      this.ui.input.focus();
    },

    // compares the query term when a request started to the current state
    searchTermOutdated: function (query) {
      // assumes that if no query argument is passed in, or is empty then the searchTerm is not outdate
      if (!query) return false;
      return query !== this.model.get('searchTerm');
    },

    handleChange: function (e) {
      this.model.set('searchTerm', e.target.value.trim());
    },

    handlePrev: function (e) {
      e.preventDefault();
      if (this.isEmpty()) return;
      this.navigation.prev();
      this.scroll();
    },

    handleNext: function () {
      if (this.isEmpty()) return;
      this.navigation.next();
      this.scroll();
    },

    scroll: function() {
      var mv = this.serverMessagesView.children.findByModel(this.navigation.current());
      if (mv) this.serverMessagesView.scrollTo(mv);
      var rv = this.localRoomsView.children.findByModel(this.navigation.current());
      if (rv) this.localRoomsView.scrollTo(rv);
    },

    handleGo: function () {
      if (this.isEmpty()) return;
      var item = this.navigation.current();
      if (item) item.trigger('select');
    }
  });

  cocktail.mixin(SearchView, KeyboardEventsMixin);

  return SearchView;
});
