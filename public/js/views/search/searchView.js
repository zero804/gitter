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

    handleClick: function (e) {
      this.selectedItem(this.model, e);
    }
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
      this.chatCollection = itemCollections.chats;
      this.chatView = chatCollectionView;
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

    itemView: RoomResultItemView,

    initialize: function () {
      // request troupe from parents
      appEvents.triggerParent('troupeRequest', {});

      // once parent has loaded the rooms
      appEvents.on('troupesResponse', function (rooms) {
        this.rooms = new Backbone.Collection(rooms);
      }.bind(this));

      this.listenTo(this.model, 'change', function (m) {
        this.search(m.get('searchTerm'));
      }.bind(this));
    },

    search: function (query) {
      var bnc = multiDebounce({ }, function () {
        var filter = textFilter({ query: query, fields: ['uri'] });
        var filtered = this.rooms.filter(filter);
        this.collection = new Backbone.Collection(filtered);
      }, this);

      bnc();
    }
  });

  // server messages results region
  var MessagesCollectionView = Marionette.CollectionView.extend({

    itemView: MessageResultItemView,

    initialize: function () {

      this.collection = new ChatSearchModels.ChatSearchCollection([], { });

      this.listenTo(this.model, 'change', function (m) {
        this.changeDebounce(m.get('searchTerm'));
      }.bind(this));

      this.changeDebounce = multiDebounce({ }, function () {
        // 'should fetch server messages'
        var text = this.model.get('searchTerm');
        if (!text) return;
        this.collection.fetchSearch(text);
      }, this);
    }
  });



  // search view
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

    keyboardEvents: {
      'focus.search': 'activate',
      'search.prev': 'navigate',
      'search.next': 'navigate',
      'search.go': 'selectSearchItem'
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

      // initialize the views
      this.LocalRoomsView = new RoomsCollectionView({ model: this.model });
      this.ServerMessagesView = new MessagesCollectionView({ model: this.model });
      // this.activeView = this.LocalRoomsView;
      // this.activeIndex = 0;
    },

    handleChange: function (e) {
      this.model.set('searchTerm', e.target.value);
    },

    hideResults: function () {
      this.ui.results.hide();
    },

    activate: function () {
      var input = this.ui.input;
      if (input.is(':focus')) return/* alert('already focused')*/;
      input.focus();
    },

    run: function (m, searchTerm) {
      if (searchTerm) {
        this.showResults();
        this.triggerMethod('search:active');
      } else {
        this.hideResults();
        this.triggerMethod('search:inactive');
      }
    },

    showResults: function () {
      this.ui.results.show();
      // render new results in regions
      this.rooms.show(this.LocalRoomsView); // local rooms
      this.messages.show(this.ServerMessagesView); // server chat messages
    },

    navigate: function () {
    },

    selectSearchItem: function () {
      // trigger some sort of event
    }
  });

  cocktail.mixin(SearchView, KeyboardEventsMixin);

  return SearchView;
});
