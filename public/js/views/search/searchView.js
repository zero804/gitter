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

    events: {
      'click': 'handleClick'
    },

    template: resultTemplate,

    className: 'result',

    initialize: function () {
      var model = this.model;
      this.$el.toggleClass('selected', !!model.get('selected')); // checks

      this.listenTo(model, 'search:selected', function () {
        this.handleClick();
      }.bind(this));

      this.listenTo(model, 'change', function (model) {
        this.$el.toggleClass('selected', !!model.get('selected'));
        // scroll into view if needed
      });
    },

    handleClick: function () {
      this.selectedItem();
    }
  });

  var RoomResultItemView = ResultItemView.extend({

    serializeData: function () {
      var data = {};
      var uri = this.model.get('uri');
      data.selected = this.model.get('selected');
      data.detail = this.model.get('githubType');
      data.text = uri;
      data.avatarUrl = 'https://avatars.githubusercontent.com/' + uri.split('/')[0] + '?s=50';
      return data;
    },

    selectedItem: function () {
      //debug('selectedItem() ====================');
      appEvents.trigger('navigation', this.model.get('url'), 'chat', name);
    }
  });

  var MessageResultItemView = ResultItemView.extend({

    serializeData: function () {
      var data = {};
      var model = this.model;
      data.selected = model.get('selected');
      data.detail = model.get('fromUser').username + ' • ' + model.get('sent').fromNow();
      data.text = model.get('text');
      data.avatarUrl = model.get('fromUser').avatarUrlSmall;
      return data;
    },

    selectedItem: function () {
      //debug('selectedItem() ====================');
      var id = this.model.get('id');

      itemCollections.chats.fetchAtPoint({ aroundId: id }, {}, function () {
        try {
          chatCollectionView.scrollToChatId(id);
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
      //debug('SearchNavigationController.initialize() ====================');
      this.collection = options.collection;

      // if the collection has changed we need to reset our selection
      this.listenTo(this.collection, 'add remove', function (model) {
       this.swap(this.collection.at(0));
      });
    },

    swap: function (model) {
      // //debug('swap() ====================');
      if (this.selected) this.selected.set('selected', false);
      model.set('selected', true);
      this.selected = model;
    },

    next: function () {
      // //debug('next() ====================');
      var index = this.collection.indexOf(this.selected);

      if (index < this.collection.length - 1) {
        this.swap(this.collection.at(index + 1 ));
      }

      // //debug('new index:', this.collection.indexOf(this.selected));
    },

    prev: function () {
      // //debug('prev() ====================');
      var index = this.collection.indexOf(this.selected);

      if (index > 0) {
        this.swap(this.collection.at(index - 1));
      }

      // //debug('new index:', this.collection.indexOf(this.selected));
    },

    current: function () {
      // //debug('current() ====================');
      return this.selected;
    },

    reset: function () {
      this.selected = this.collection.at(0);
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

      this.listenTo(this.collection, 'remove', function () {
        //debug('collection:remove() ====================');
        //debug('this.collection.length:', this.collection.length);
      });

      rooms.setFilter(function (model) {
        return !!model.get('uri');
      });

      chats.setFilter(function (model) {
        return !!model.get('text');
      });

      this.navigation = new SearchNavigationController({ collection: this.collection, rooms: this._rooms });

      // initialize the views
      this.localRoomsView = new RoomsCollectionView({ collection: rooms });
      this.serverMessagesView = new MessagesCollectionView({ collection: chats });
      this.debouncedLocalSearch =  _.debounce(this.localSearch.bind(this), 250);
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

    run: function (/*model, searchTerm*/) {
      //debug('run() ====================');
      if (this.isEmpty()) {
        this.hideResults();
        this.collection.reset();
        this.triggerMethod('search:hide');
      } else {
        // this.collection.reset();
        this.debouncedLocalSearch();
        this.debouncedRemoteSearch();
        this.showResults();
        this.triggerMethod('search:show');
      }
    },

    localSearch: function () {
      var self = this;
      // self.collection.remove(self._rooms.models);
      // self._rooms.resetCollection(); // we must clear the current collection

      // once parent has loaded the rooms
      appEvents.once('troupesResponse', function (rooms) {
        //debug('troupesResponse() ====================');
        var collection = new Backbone.Collection(rooms);
        var filter = textFilter({ query: self.model.get('searchTerm'), fields: ['uri'] });
        var filtered = collection.filter(filter);
        // //debug('about to remove() ====================');
        // self.collection.remove(self._rooms.models);
        // //debug('about to add() ====================');
        self.collection.add(filtered, { at: 0, merge: true }); // add new matches
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
      //debug('selectedItem:', selectedItem);
      selectedItem.trigger('search:selected');
      //debug('should submit action at index', selectedItem.get('uri') || selectedItem.get('text'), selectedItem.get('selected'));
    }
  });

  cocktail.mixin(SearchView, KeyboardEventsMixin);

  return SearchView;
});
