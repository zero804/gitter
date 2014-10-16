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
  'utils/text-filter',
  'utils/multi-debounce',
  'views/keyboard-events-mixin',
], function (appEvents, Backbone, Marionette, _, cocktail, itemCollections, ChatSearchModels, troupeCollections, chatCollectionView, ChatItemView, searchTemplate, resultTemplate, textFilter, multiDebounce, KeyboardEventsMixin) {
  "use strict";

  var ResultView = Marionette.ItemView.extend({

    events: {
      'click': 'handleClick'
    },

    template: resultTemplate,
    className: 'result',

    handleClick: function (e) {
      this.selectedItem(this.model, e);
    }
  });

  var LocalResultView = ResultView.extend({
    // className: 'result--rooms',

    serializeData: function () {
      var data = {};
      var uri = this.model.get('uri');
      data.text = uri;
      data.avatarUrl = 'https://avatars.githubusercontent.com/' + uri.split('/')[0] + '?s=50';
      return data;
    },

    selectedItem: function (model) {
      appEvents.trigger('navigation', model.get('url'), 'chat', name);
    }
  });

  var ServerResultView = ResultView.extend({

    // className: 'result--messages',

    initialize: function () {
      this.chatCollection = itemCollections.chats;
      this.chatView = chatCollectionView;
    },

    serializeData: function () {
      var data = {};
      var model = this.model;
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

  // local rooms results
  var LocalRooms = Marionette.CollectionView.extend({

    itemView: LocalResultView,

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
        var filter = textFilter({ query: query, fields: ['uri']});
        var filtered = this.rooms.filter(filter);
        this.collection = new Backbone.Collection(filtered);
      }, this);

      bnc();
    }
  });

  // server rooms results
  // var ServerRooms = Marionette.CollectionView.extend({
  //   initialize: function () {
  //     this.listenTo(this.model, 'change', function (m) {
  //       // 'model changed inside ServerRooms'
  //     }.bind(this));
  //   }
  // });

  // messages results
  var ServerMessages = Marionette.CollectionView.extend({

    itemView: ServerResultView,

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
  var Layout = Marionette.Layout.extend({
    template: searchTemplate,

    className: 'search',

    ui: {
      input: '.js-search-input'
    },

    regions: {
      'localRooms': '.js-search-local-rooms',
      'serverRooms': '.js-search-server-rooms',
      'serverMessages': '.js-search-server-messages'
    },

    keyboardEvents: {
      'focus.search': 'activateSearch'
    },

    events: {
      'cut @ui.input': 'handleChange',
      'paste @ui.input': 'handleChange',
      'change @ui.input': 'handleChange',
      'input @ui.input': 'handleChange'
    },

    initialize: function () {

      this.model = new Backbone.Model({ searchTerm: '' });

      this.listenTo(this.model, 'change', function () {
        this.showResults();
      }.bind(this));

      // TODO: create view for each region, with the searchView model
      this.ServerMessagesView = new ServerMessages({ model: this.model });
      // this.ServerRoomsView = new ServerRooms({ model: this.model });
      this.LocalRoomsView = new LocalRooms({ model: this.model });
    },

    handleChange: function (e) {
      //.debug('setting searchTerm to:', e.target.value);
      this.model.set('searchTerm', e.target.value);
    },

    hideResults: function () {
      //.debug('should hide search');
    },

    activateSearch: function () {
      var input = this.ui.input;
      // if (input.is(':focus')) return alert('already focused');
      input.focus();
    },

    showResults: function () {
      //.debug('showResults() ====================');

      // render results in regions
      this.localRooms.show(this.LocalRoomsView); // local rooms
      this.serverMessages.show(this.ServerMessagesView); // server chat messages
    }
  });

  cocktail.mixin(Layout, KeyboardEventsMixin);

  return Layout;
});
