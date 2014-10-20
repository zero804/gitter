define([
  'utils/appevents',
  'backbone',
  'marionette',
  'underscore',
  'cocktail',
  'collections/instances/integrated-items',
  'collections/chat-search',
  'collections/instances/troupes',
  'views/chat/chatCollectionView',
  '../chat/chatItemView',
  'hbs!./tmpl/search',
  'hbs!./tmpl/result',
  'utils/momentWrapper',
  'utils/text-filter',
  'utils/multi-debounce',
  'views/keyboard-events-mixin',
], function (appEvents, Backbone, Marionette, _, cocktail, itemCollections, ChatSearchModels, troupeCollections, chatCollectionView, ChatItemView, searchTemplate, resultTemplate, moment, textFilter, multiDebounce, KeyboardEventsMixin) {
  "use strict";

  // Result Items Views
  var ResultItemView = Marionette.ItemView.extend({
    modelEvents: {
      'click': 'selectedItem'
    },
    template: resultTemplate,
    className: 'result',
  });

  var RoomResultItemView = ResultItemView.extend({

    serializeData: function () {
      var data = {};
      var uri = this.model.get('uri');
      data.detail = this.model.get('githubType');
      data.text = uri;
      data.avatarUrl = 'https://avatars.githubusercontent.com/' + uri.split('/')[0] + '?s=50';
      return data;
    },

    selectedItem: function (model) {
      appEvents.trigger('navigation', model.get('url'), 'chat', name);
    }
  });

  var MessageResultItemView = ResultItemView.extend({

    initialize: function () {
      var self = this;

      this.chatCollection = itemCollections.chats;
      this.chatView = chatCollectionView;

      appEvents.on('search:run', function (payload) {
        self.selectedItem(payload.model);
      });
    },

    serializeData: function () {
      var data = {};
      var model = this.model;
      data.detail = model.get('fromUser').username + ' • ' + model.get('sent').fromNow();
      data.text = model.get('text');
      data.avatarUrl = model.get('fromUser').avatarUrlSmall;
      return data;
    },

    selectedItem: function (model) {
      var id = model.get('id');

      this.chatCollection.fetchAtPoint({ aroundId: id }, {}, function () {
        try {
          this.chatView.scrollToChatId(id);
        } catch (e) {
          // TODO: do something with error? @suprememoocow
        }
      }, this);
    }
  });

  // local rooms results region
  var RoomsCollectionView = Marionette.CollectionView.extend({
    itemView: RoomResultItemView
  });

  // server messages results region
  var MessagesCollectionView = Marionette.CollectionView.extend({
    itemView: MessageResultItemView
  });

  var SearchNavigationController = Marionette.Controller.extend({

    initialize: function (options) {
      // FIXME: When this becomes a Backbone collection make sure to update the other methods.
      this.collection = options.collection;
      this.selected = this.collection.at(0);
    },

    swap: function (model) {
      this.selected.set('active', false);
      this.selected = model.set('active', true);
    },

    next: function () {
      console.debug('next() ====================');
      var index = this.collection.indexOf(this.selected);

      if (index < this.collection.length - 1) {
        this.swap(index + 1);
      }
      console.debug('this.index:', index);
    },

    prev: function () {
      console.debug('prev() ====================');
      var index = this.collection.indexOf(this.selected);
      if (index > 0) {
        this.swap(index - 1);
      }
      console.debug('this.index:', index);
    },

    current: function () {
      console.debug('current() ====================');
      return this.selected;
    },

    reset: function () {
      this.index = 0;
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
      'search.prev': 'handlePrev',
      'search.next': 'handleNext',
      'search.go': 'handleGo'
    },

    events: {
      'cut @ui.input': 'handleChange',
      'paste @ui.input': 'handleChange',
      'change @ui.input': 'handleChange',
      'input @ui.input': 'handleChange'
    },

    initialize: function () {

      this.model = new Backbone.Model({ searchTerm: '' });
      this.listenTo(this.model, 'change:searchTerm', this.run);
      this.collection = new Backbone.Collection([]);

      var rooms = new Backbone.FilteredCollection(null, { model: Backbone.Model, collection: this.collection });
      var chats = new Backbone.FilteredCollection(null, { model: Backbone.Model, collection: this.collection });

      this._rooms = rooms;
      this._chats = chats;

      rooms.setFilter(function (model) {
        return !!model.get('uri');
      });

      chats.setFilter(function (model) {
        return !!model.get('text');
      });

      this.navigation = new SearchNavigationController({ collection: this.collection });

      // initialize the views
      this.localRoomsView = new RoomsCollectionView({ collection: rooms });
      this.serverMessagesView = new MessagesCollectionView({ collection: chats });
      this.debouncedLocalSearch =  _.debounce(this.localSearch.bind(this), 10);
      this.debouncedRemoteSearch = _.debounce(this.remoteSearch.bind(this), 250);
    },

    isEmpty: function () {
      return !this.model.get('searchTerm');
    },

    handleChange: function (e) {
      this.model.set('searchTerm', e.target.value.trim());
    },

    hideResults: function () {
      this.ui.results.hide();
    },

    activate: function () {
      var input = this.ui.input;
      if (input.is(':focus')) return/* alert('already focused')*/;
      input.focus();
    },

    run: function (model, searchTerm) {
      if (this.isEmpty()) {
        this.hideResults();
        this.collection.reset();
        this.triggerMethod('search:hide');
      } else {
        this.debouncedLocalSearch();
        this.debouncedRemoteSearch();
        this.showResults();
        this.triggerMethod('search:show');
      }
    },

    localSearch: function() {
      var self = this;
      // once parent has loaded the rooms
      appEvents.once('troupesResponse', function (rooms) {
        var collection = new Backbone.Collection(rooms);
        var filter = textFilter({ query: self.model.get('searchTerm'), fields: ['uri'] });
        var filtered = collection.filter(filter);
        self.collection.remove(self._rooms.models);     // remove previous results
        self.collection.add(filtered, { merge: true }); // add new matches
      }.bind(this));

      // request troupe from parents
      appEvents.triggerParent('troupeRequest', { });
    },

    remoteSearch: function() {
      var self = this;
      var chatSearchCollection = new ChatSearchModels.ChatSearchCollection([], { });
      chatSearchCollection.fetchSearch(this.model.get('searchTerm'), function () {
        self.collection.add(chatSearchCollection.models, { merge: true });
      }, this);
    },

    showResults: function () {
      this.navigation.reset();
      this.ui.results.show();
      // render new results in regions
      this.rooms.show(this.localRoomsView); // local rooms
      this.messages.show(this.serverMessagesView); // server chat messages
    },

    handlePrev: function (e) {
      e.preventDefault();
      if (this.isEmpty()) return;
      this.navigation.prev();
    },

    handleNext: function () {
      if (this.isEmpty()) return;
      this.navigation.next();
    },

    handleGo: function () {
      if (this.isEmpty()) return;
      var selectedItem = this.navigation.current();
      console.debug('should submit action at index', selectedItem);
    }
  });

  cocktail.mixin(SearchView, KeyboardEventsMixin);

  return SearchView;
});
