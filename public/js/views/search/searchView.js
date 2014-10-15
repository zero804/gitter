define([
  'utils/appevents',
  'marionette',
  'underscore',
  'collections/instances/integrated-items',
  'collections/chat-search',
  'collections/instances/troupes',
  'views/chat/chatCollectionView',
  '../chat/chatItemView',
  'hbs!./tmpl/searchView',
  'hbs!./tmpl/localRoomTemplate',
  'utils/multi-debounce',
  'utils/text-filter'
], function (appEvents, Marionette, _, itemCollections, ChatSearchModels, troupeCollections, chatCollectionView, ChatItemView, template, localRoomTemplate, multiDebounce, textFilter) {
  "use strict";

  var LocalRoomView = Marionette.ItemView.extend({
    template: localRoomTemplate
  });

  var LocalRooms = Marionette.CollectionView.extend({

    itemView: LocalRoomView,

    initialize: function () {
      this.collection = new Backbone.Collection([]);

      appEvents.triggerParent('init-search',  { init: true });
      appEvents.on('troupes', function(troupes) {
        this.rooms = new Backbone.Collection(troupes.map(function(t) { return new Backbone.Model(t); }));
        console.debug('rooms', this.rooms);
      }.bind(this));

      this.listenTo(this.model, 'change', function (m) {
        this.search(m.get('searchTerm'));
      }.bind(this));
    },

    search: function(query) {
      var bnc = multiDebounce({ }, function () {
        var filter = textFilter({ query: query, fields: ['uri']});
        var filtered = this.rooms.filter(filter);
        console.debug('results:', filtered);
        this.collection.add(filtered);
        console.debug('collection', this.collection);
      }, this);
      bnc();
    }
  });

  var ServerRooms = Marionette.CollectionView.extend({
    initialize: function () {
      this.listenTo(this.model, 'change', function (m) {
        // 'model changed inside ServerRooms'
      }.bind(this));
    }
  });

  var ServerMessages = Marionette.CollectionView.extend({

    itemView: ChatItemView.ChatItemView,

    initialize: function () {

      this.collection = new ChatSearchModels.ChatSearchCollection([], { });
      this.chatCollection = itemCollections.chats;
      this.chatView = chatCollectionView;

      this.listenTo(this.model, 'change', function (m) {
        this.changeDebounce(m.get('searchTerm'));
      }.bind(this));

      this.changeDebounce = multiDebounce({ }, function () {
        // 'should fetch server messages'
        var text = this.model.get('searchTerm');
        this.collection.fetchSearch(text);
      }, this);
    },

    onItemviewSelected: function (childView, model) {
      // 'SELECTED'

      this.chatCollection.fetchAtPoint({ aroundId: model.id }, {}, function () {
        try {
          this.chatView.scrollToChatId(model.id);
        } catch (e) {
          // TODO: do something with error? @suprememoocow
          // e.stack
        }
      }, this);
      // window.alert('CLICKED');
    }
  });

  var Layout = Marionette.Layout.extend({
    template: template,

    className: 'search',

    ui: {
      input: '.js-search-input'
    },

    regions: {
      'localRooms': '.js-search-local-rooms',
      'serverRooms': '.js-search-server-rooms',
      'serverMessages': '.js-search-server-messages'
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
      this.ServerRoomsView = new ServerRooms({ model: this.model });
      this.LocalRoomsView = new LocalRooms({ model: this.model });
    },

    handleChange: function (e) {
      //.debug('setting searchTerm to:', e.target.value);
      this.model.set('searchTerm', e.target.value);
    },

    hideResults: function () {
      //.debug('should hide search');
    },

    showResults: function () {
      //.debug('showResults() ====================');

      // render results in regions
      // this.localRooms.show(this.LocalRoomsView); // local rooms
      this.serverRooms.show(this.ServerMessagesView); // server chat messages
    }
  });

  // FIXME DEPRECATED
  var View = Marionette.CompositeView.extend({

    itemViewContainer: '#search-results',

    itemView: ChatItemView.ChatItemView,

    template: template,

    ui: {
      input: '.js-search-input'
    },

    events: {
      'cut @ui.input': 'changeDebounce',
      'paste @ui.input': 'changeDebounce',
      'change @ui.input': 'changeDebounce',
      'input @ui.input': 'changeDebounce'
    },

    initialize: function () {
      if (!this.options.chatView) throw new Error('You must provide a chatView');
      this.bindUIElements(); // FIXME this is already called by default?

      this.collection = new ChatSearchModels.ChatSearchCollection([], { });
      this.chatCollection = itemCollections.chats;
      this.chatView = chatCollectionView;

      this.changeDebounce = multiDebounce({ }, function () {
        var text = this.ui.input.val();
        // search server - text messages
        this.collection.fetchSearch(text);
        // search server - rooms
        // search local - rooms
      }, this);
    },

    onItemviewSelected: function (childView, model) {
      this.chatCollection.fetchAtPoint({ aroundId: model.id }, {}, function () {
        try {
          this.chatView.scrollToChatId(model.id);
        } catch (e) {
          // TODO: do something with error? @suprememoocow
        }
      }, this);
      // window.alert('CLICKED');
    }
  });

  return Layout;
});
