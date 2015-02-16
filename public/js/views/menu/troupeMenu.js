"use strict";
var $ = require('jquery');
var Marionette = require('marionette');
var Backbone = require('backbone');
var context = require('utils/context');
var appEvents = require('utils/appevents');
var isMobile = require('utils/is-mobile');
var troupeCollections = require('collections/instances/troupes');
var RoomCollectionView = require('./room-collection-view');
var SuggestedCollectionView = require('./suggested-collection-view');
var log = require('utils/log');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var template = require('./tmpl/troupeMenu.hbs');
var CollectionWrapperViewTemplate = require('./tmpl/collection-wrapper-view.hbs');
var ProfileView = require('./profileView');
var OrgCollectionView = require('./orgCollectionView');

var apiClient = require('components/apiClient');

require('nanoscroller');

var SUGGESTED_ROOMS_THRESHOLD = 10; // non inclusive

module.exports = (function () {

  // Reply back to the child iframe - used in search
  appEvents.on('troupeRequest', function (payload, evt) {
    var msg = { child_window_event: ['troupesResponse', troupeCollections.troupes] };
    evt.source.postMessage(JSON.stringify(msg), evt.origin);
  });

  // wraps a view to give us more control of when to display it or not
  var CollectionWrapperView = Marionette.Layout.extend({

    ui: {
      hide: '.js-hide',
    },

    events: {
      'click @ui.hide': 'handleHide'
    },

    regions: {
      list: "#list"
    },

    template: CollectionWrapperViewTemplate,

    initialize: function (options) {
      this.bindUIElements();

      this.collectionView = options.collectionView;
      this.collection = this.collectionView.collection;
      this.listenTo(this.collection, 'sync', this.render);
      this.listenTo(this.collection, 'sync add reset remove', this.display);
      this.handleHide = options.handleHide;
    },

    serializeData: function () {
      return {
        canHide: typeof this.handleHide === 'function',
        header: this.options.header
      };
    },

    onRender: function () {
      if (this.collection.length) {
        this.$el.show();
      } else {
        this.$el.hide();
      }
      this.list.show(this.collectionView);

      if (this.handleHide) {
        var hideIcon = this.ui.hide;
        hideIcon.tooltip({ container: 'body', title: 'Hide forever' });
      }
    },

    display: function () {
      if (this.collection.length > 0) {
        this.$el.show();
      } else {
        this.$el.hide();
      }
    }
  });

  var View = Marionette.ItemView.extend({
    className: 'js-menu menu',
    template: template,
    selectedListIcon: "icon-troupes",

    ui: {
      nano: '.nano',
      profile: '#left-menu-profile',
      recent: '#list-recents ul',
      favs: '#list-favs ul',
      orgs: '#left-menu-list-orgs',
      suggested: '#left-menu-list-suggested'
    },

    events: function () {
      var events = {};

      if (!isMobile()) {
        events['click #left-menu-profile'] = 'toggleHeaderExpansion';
      }

      return events;
    },

    keyboardEvents: {
      'room.up': 'selectPrev',
      'room.down': 'selectNext',
      'room.enter': 'navigateToCurrent',
      // Not working properly due to recent conversations sorting by date
      // 'room.prev': 'navigateToPrev',
      // 'room.next': 'navigateToNext',
      'room.1 room.2 room.3 room.4 room.5 room.6 room.7 room.8 room.9 room.10': 'navigateToRoom'
    },

    initialize: function () {
      this.bindUIElements();
      // this.initHideListeners = _.once(_.bind(this.initHideListeners, this));
      this.repoList = false;

      this.state = new Backbone.Model({
        menuHeaderExpanded: false
      });

      var self = this;

      var showMenu = function () {
        $('#menu').removeClass('menu--collapsed');
      };

      appEvents.on('menu:hide', function () {
        $('#menu').addClass('menu--collapsed');
      });

      appEvents.on('menu:show', showMenu);
      appEvents.on('navigation', showMenu);
      appEvents.on('troupeUnreadTotalChange', function(values) {
        var unreadText = values.overall || ' ';
        self.$el.find('#menu-tab-unread-count').text(unreadText);
      });

      this.selectedIndex = 0;

      // Keep track of conversation change to select the proper element
      appEvents.on('context.troupeId', function(id) {
        $('#recentTroupesList li').removeClass('selected');
        var index = self.getIndexForId(id);
        if (index) self.selectedIndex = index;
      });

      // determining whether we should show the suggested rooms or not
      var hasItems = troupeCollections.troupes && !!(troupeCollections.troupes.length);

      if (hasItems) {
        this.getSuggestedRooms();
      } else {
        this.listenToOnce(troupeCollections.troupes, 'sync', function() {
          this.getSuggestedRooms();
        }.bind(this));
      }
    },

    getSuggestedRooms: function () {
      var suggestedRoomsHidden = context().suggestedRoomsHidden;

      if (!suggestedRoomsHidden && troupeCollections.troupes.length < SUGGESTED_ROOMS_THRESHOLD) {
        troupeCollections.suggested.fetch();
      }
    },

    setupNanoScroller: function (collection) {
      var ui = this.ui;
      var target = ui.nano[0];
      if (!target) return;

      var initScroller = function () {
        $(target).nanoScroller({ iOSNativeScrolling: true });
      };

      initScroller(); // initalise on startup

      // listening to events that can affect height, therefore scroll
      this.listenTo(collection, 'add remove', function () {
        setTimeout(initScroller, 100); // FIXME: requestAnimation frame does not work here :(
      });
    },

    // FIXME: WARNING -> THIS METHOD IS UNSAFE.
    getIndexForId: function(id) {
      if (!id) return;
      var els = $('#recentTroupesList li');
      for (var i = 0, el; el = els[i]; i++) {
        if ($(el).data('id') === id) return i;
      }
    },

    selectPrev: function(event) {
      appEvents.trigger('focus.request.out', event);
      var i = this.selectedIndex - 1;
      if (i === -1) i = 0; // Select first element
      this.select(i);
    },

    selectNext: function(event) {
      appEvents.trigger('focus.request.out', event);
      this.select(this.selectedIndex + 1);
    },

    select: function(i) {
      var itemElements = $('#recentTroupesList li');
      if (i >= 0 && i < itemElements.length) {
        this.selectedIndex = i;
        itemElements.removeClass('selected');
        $(itemElements[this.selectedIndex]).addClass('selected');
      }
    },

    navigateToCurrent: function () {
      var itemElements = $('#recentTroupesList li');
      itemElements.removeClass('selected');
      $(itemElements[this.selectedIndex]).click();
    },

    navigateTo: function (i) {
      var itemElements = $('#recentTroupesList li');
      if (i >= 0 && i < itemElements.length) {
        this.selectedIndex = i;
        $(itemElements[i]).click();
      }
    },

    navigateToRoom: function (e, handler) {
      var keys = handler.key.split('+');
      var key = keys[ keys.length - 1 ];
      if (key === '0') return this.navigateTo(9);
      var index = parseInt(key, 10) - 1;
      this.navigateTo(index);
    },

    serializeData: function() {
      return {
        showFooterButtons: !isMobile(),
        showExapandedHeader: isMobile()
      };
    },

    show: function () {
      this.setupNanoScroller(troupeCollections.troupes);

      var ui = this.ui;

      new ProfileView({ el: ui.profile, state: this.state });

      // mega-list: recent troupe view
      new RoomCollectionView({
        collection: troupeCollections.favourites,
        rerenderOnSort: true,
        draggable: true,
        dropTarget: true,
        roomsCollection: troupeCollections.troupes,
        el: ui.favs
      });

      new RoomCollectionView({
        collection: troupeCollections.recentRoomsNonFavourites,
        rerenderOnSort: true,
        draggable: true,
        dropTarget: true,
        roomsCollection: troupeCollections.troupes,
        el: ui.recent
      });

      // Organizations collection view
      new CollectionWrapperView({
        collectionView: new OrgCollectionView({ collection: troupeCollections.orgs }),
        header: 'Your Organizations',
        el: ui.orgs
      });

      // Suggested repos
      new CollectionWrapperView({
        collectionView: new SuggestedCollectionView({ collection: troupeCollections.suggested }),
        header: 'Suggested Rooms',
        el: ui.suggested,
        // a little bit messy sorry
        handleHide: function () {
          apiClient.user
            .put('/settings/suggestedRoomsHidden', { value: true })
            .then(function () {
              troupeCollections.suggested.reset();
            })
            .fail(function (err) {
              log.error(err);
            });
        }
      });
    },

    onRender: function () {
      this.show();
    },

    toggleHeaderExpansion: function() {
      this.state.set('menuHeaderExpanded', !this.state.get('menuHeaderExpanded'));
      $('#left-menu-profile').toggleClass('menu-header--expanded');
    }
  });

  cocktail.mixin(View, KeyboardEventsMixin);

  return View;

})();
