define([
  'jquery',
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
  'utils/text-filter',
  'utils/multi-debounce',
  'views/keyboard-events-mixin',
  'views/behaviors/widgets', // No ref
  'views/behaviors/highlight' // No ref
], function ($, apiClient, context, appEvents, Rollers, Backbone, Marionette, _, cocktail, itemCollections, ChatSearchModels, searchTemplate, resultTemplate, textFilter, multiDebounce, KeyboardEventsMixin) {
  "use strict";

  var EmptyResultsView = Marionette.ItemView.extend({
    className: 'result-empty',
    template: _.template('<small>No Results</small>')
  });

  var ResultItemView = Marionette.ItemView.extend({

    events: {
      'click': 'handleSelect'
    },

    modelEvents: {
      'select': 'handleSelect', // this handles "enter"
    },

    template: resultTemplate,

    className: 'result',

    initialize: function (options) {
      var model = this.model;
      this.$el.toggleClass('selected', !!model.get('selected')); // checks if it is selected

      this.listenTo(model, 'change:selected', function (m, selected) {
        this.$el.toggleClass('selected', !!selected);
        if (selected) { /* FIXME longer lists, do we need to scroll m into view?; */ }
      });
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
        appEvents.trigger('chatCollectionView:scrolledToChat', id);
      }, this);
    }
  });

  var RoomsCollectionView = Marionette.CollectionView.extend({
    itemView: RoomResultItemView,
    emptyView: EmptyResultsView,
    initialize: function() {
      var target = document.querySelector("#toolbar-content");
      this.rollers = new Rollers(target, this.el, {doNotTrack: true});
    },
    scrollTo: function(v) {
      this.rollers.scrollToElement(v.el, {centre: true});
    }

  });

  var MessagesCollectionView = Marionette.CollectionView.extend({
    itemView: MessageResultItemView,
    emptyView: EmptyResultsView,
    initialize: function() {
      var target = document.querySelector("#toolbar-content");
      this.rollers = new Rollers(target, this.el, {doNotTrack: true});
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
      input: '.js-search-input'
    },

    regions: {
      rooms: '.js-search-rooms',
      messages: '.js-search-messages',
    },

    // the shortcuts need to be handled at the top level component
    keyboardEvents: {
      'focus.search': 'activate',
      'search.escape': 'dismiss',
      'search.prev': 'handlePrev',
      'search.next': 'handleNext',
      'search.go': 'handleGo'
    },

    // FIXME this redundant reference is a little strange
    events: {
      'click .js-activate-search': 'activate',
      'cut @ui.input': 'handleChange',
      'paste @ui.input': 'handleChange',
      'change @ui.input': 'handleChange',
      'input @ui.input': 'handleChange'
    },

    onRender: function() {
    },

    initialize: function () {
      this.model = new Backbone.Model({ searchTerm: '', active: false });



      // FIXME: Make sure this is a good thing
      var debouncedRun = _.debounce(this.run.bind(this), 125);

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

      this._rooms = rooms;
      this._chats = chats;

      // making navigation and filtered collections  accessible
      this.navigation = new NavigationController({ collection: this.collection });

      // initialize the views
      this.localRoomsView = new RoomsCollectionView({ collection: rooms });
      this.serverMessagesView = new MessagesCollectionView({ collection: chats });
      this.debouncedLocalSearch =  _.debounce(this.localSearch.bind(this), 125);
      this.debouncedRemoteSearch = _.debounce(this.remoteSearch.bind(this), 250);
    },

    isActive: function () {
      return this.model.get('active');
    },

    isEmpty: function () {
      return !this.model.get('searchTerm');
    },

    // this is used to collapse
    dismiss: function () {
      this.model.set('active', false);
      this.ui.input.val(function () { return ''; });
      this.model.set('searchTerm', '');
      this.hide();
      this.triggerMethod('search:collapse');
      appEvents.triggerParent('menu:show'); // hide menu
    },

    activate: function () {

      var model = this.model;
      model.set('active', !this.isActive());

      var innerWidth = window.innerWidth;

      if (innerWidth < 880) {
        this.triggerMethod('search:expand');
        if (innerWidth >= 680) {
          appEvents.triggerParent('menu:hide'); // hide menu
        }
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
      this.ui.results.hide();
      this.collection.reset();
      this.triggerMethod('search:hide');
    },

    run: function (/*model, searchTerm*/) {
      //debug('run() ====================');
      this.debouncedLocalSearch();
      this.debouncedRemoteSearch();
      this.showResults();
      this.triggerMethod('search:show');
    },

    /*
     * filteredCollection - the collection we are updating
     * newModels          - the new models to be added
     * options            - same options as Backbone.Collection.add
     */
    refreshCollection: function (filteredCollection, newModels, options) {
      //debug('refreshCollection() ====================');
      var getId = function (item) { return item.id };

      // if the new models are the same as the current filtered collection avoids flickering by returning
      if (_.isEqual(newModels.map(getId), filteredCollection.map(getId))) return;

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

    localSearch: function () {
      //debug('localSearch() ====================');
      // perform only once in response
      appEvents.once('troupesResponse', function (rooms) {
        var collection = new Backbone.Collection(rooms);
        var filter = textFilter({ query: this.model.get('searchTerm'), fields: ['url', 'name'] });
        var results = collection.filter(filter);

        results.map(function(r) { r.set('exists', true); r.set('priority', 0); }); // local results always exist

        try {
          this.refreshCollection(this._rooms, results, { at: this.collection.length, merge: true });
        } catch (e) {
          // new Error('Could not perform local search.');
        }
      }.bind(this));

      // request troupe from parent frame
      appEvents.triggerParent('troupeRequest', { });
    },

    remoteSearch: function() {
      //debug('remoteSearch() ====================');
      //time('remoteSearch');
      var query = this.model.get('searchTerm');

      // Find messages on ElasticSearch
      var chatSearchCollection = new ChatSearchModels.ChatSearchCollection([], { });
      chatSearchCollection.fetchSearch(query, function () {
        try {
          this.refreshCollection(this._chats, chatSearchCollection.models.map(function (item) {
            item.set('priority', 2);
            return item;
          }));
        } catch (e) {
          // new Error('Could not perform remote search.');
        }
      }.bind(this), this);

      // Find users, repos and channels on the server
      var self = this;
      var rooms = [];

      // Merge local and remote results and refresh the collection
      var refresh = function() {
        // //debug('about to add remote rooms() ====================');
        self.refreshCollection(self._rooms, rooms, { nonDestructive: true });
        //timeEnd('remoteSearch');
      };

      var debouncedRefresh = _.debounce(refresh, 100);

      var cb = function (data) {

        if (!data.results) return;
        var models = data.results
          .slice(0, 2)
          .map(function(r) {
            if (r.room) r.id = r.room.id; // use the room id as model id for repos
            r.url = r.url || '/' + r.uri;
            r.priority = 1;
            return new Backbone.Model(r);
        });
        rooms = rooms.concat(models);
        debouncedRefresh();
        //refresh();
      };

      // Find users
      $.ajax({url: '/api/v1/user', data : { q: query, type: 'gitter' }, success: cb});
      // Find repos
      $.ajax({ url: '/api/v1/user/' + context.getUserId() + '/repos', data : { q: query }, success: cb});
      // Find public repos
      $.ajax({ url: '/api/v1/public-repo-search', data : { q: query }, success: cb});
      // find channels
      $.ajax({ url: '/api/v1/channel-search', data : { q: query }, success: cb});
    },

    showResults: function () {
      this.ui.results.show();
      this.rooms.show(this.localRoomsView); // local rooms
      this.messages.show(this.serverMessagesView); // server chat messages
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
