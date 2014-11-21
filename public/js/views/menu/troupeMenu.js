"use strict";
var $ = require('jquery');
var nanoscrollWrapper = require('../../utils/nanoscroll-wrapper');
var Marionette = require('marionette');
var context = require('utils/context');
var appEvents = require('utils/appevents');
var isMobile = require('utils/is-mobile');
var troupeCollections = require('collections/instances/troupes');
var RoomCollectionView = require('views/menu/room-collection-view');
var SuggestedCollectionView = require('./suggested-collection-view');
var log = require('utils/log');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var template = require('./tmpl/troupeMenu.hbs');
var CollectionWrapperViewTemplate = require('./tmpl/collection-wrapper-view.hbs');
var SearchView = require('./searchView');
var ProfileView = require('./profileView');
var OrgCollectionView = require('./orgCollectionView');

require('nanoscroller');

module.exports = (function() {


  // Reply back to the child iframe - used in search
  appEvents.on('troupeRequest', function (payload, evt) {
    var msg = { child_window_event: ['troupesResponse', troupeCollections.troupes] };
    evt.source.postMessage(JSON.stringify(msg), evt.origin);
  });


  // wraps a view to give us more control of when to display it or not
  var CollectionWrapperView = Marionette.Layout.extend({

    regions: {
      list: "#list"
    },

    template: CollectionWrapperViewTemplate,

    initialize: function (options) {
      this.collectionView = options.collectionView;
      this.collection = this.collectionView.collection;

      this.listenTo(this.collection, 'sync add reset remove', this.display);
    },

    serializeData: function () {
      return {
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
    },

    display: function () {
      if (this.collection.length > 0) {
        this.$el.show();
      } else {
        this.$el.hide();
      }
    }
  });

  var View = Marionette.Layout.extend({
    className: 'js-menu menu',
    template: template,
    selectedListIcon: "icon-troupes",

    regions: {
      profile: "#left-menu-profile",
      recent: "#list-recents",
      favs: "#list-favs",
      // search: "#left-menu-list-search",
      orgs: "#left-menu-list-orgs",
      suggested: '#left-menu-list-suggested'
    },

    ui: {
      nano: '.nano'
    },

    events: function() {
      var events = {
        // 'click #search-clear-icon': 'onSearchClearIconClick'
      };

      if(!isMobile()) {
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

    initialize: function() {
      // this.initHideListeners = _.once(_.bind(this.initHideListeners, this));
      this.repoList = false;
      var self = this;

      var showMenu = function () {
        $('.wrap-menu').removeClass('hide');
      };

      appEvents.on('menu:hide', function () {
        $('.wrap-menu').addClass('hide');
      });

      appEvents.on('menu:show', showMenu);
      appEvents.on('navigation', showMenu);

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
        if(troupeCollections.troupes.length < 10) {
          troupeCollections.suggested.fetch();
        }
      } else {
        this.listenToOnce(troupeCollections.troupes, 'sync', function() {
          if(troupeCollections.troupes.length < 10) {
            troupeCollections.suggested.fetch();
          }
        });
      }
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

    navigateToCurrent: function() {
      var itemElements = $('#recentTroupesList li');
      itemElements.removeClass('selected');
      $(itemElements[this.selectedIndex]).click();
    },

    navigateTo: function(i) {
      var itemElements = $('#recentTroupesList li');
      if (i >= 0 && i < itemElements.length) {
        this.selectedIndex = i;
        $(itemElements[i]).click();
      }
    },

    navigateToRoom: function(e, handler) {
      var keys = handler.key.split('+');
      var key = keys[ keys.length - 1 ];
      if (key === '0') return this.navigateTo(9);
      var index = parseInt(key, 10) - 1;
      this.navigateTo(index);
    },

    serializeData: function() {
      return {
        showFooterButtons: !isMobile(),
        // showSearch: !isMobile(),
        showExapandedHeader: isMobile()
      };
    },

    onRender: function () {
      this.isRendered = true;

      if(!this.nano) {
        this.nano = nanoscrollWrapper(this.ui.nano[0], { iOSNativeScrolling: true });
      }

      this.profile.show(new ProfileView());

      // mega-list: recent troupe view
      this.favs.show(new RoomCollectionView({
        collection: troupeCollections.favourites,
        rerenderOnSort: true,
        draggable: true,
        dropTarget: true,
        roomsCollection: troupeCollections.troupes
      }));

      this.recent.show(new RoomCollectionView({
        collection: troupeCollections.recentRoomsNonFavourites,
        rerenderOnSort: true,
        draggable: true,
        dropTarget: true,
        roomsCollection: troupeCollections.troupes
      }));

      // search results collection view
      // this.searchView = new SearchView({ troupes: troupeCollections.troupes, $input: this.$el.find('#list-search-input') });
      // this.search.show(this.searchView);

      // Organizations collection view
      this.orgs.show(new CollectionWrapperView({
        collectionView: new OrgCollectionView({ collection: troupeCollections.orgs }),
        header: 'Your Organizations'
      }));

      // Suggested repos (probably hidden at first)
      this.suggested.show(new CollectionWrapperView({
        collectionView: new SuggestedCollectionView({ collection: troupeCollections.suggested }),
        header: 'Suggested Rooms'
      }));
    },

    toggleHeaderExpansion: function() {
      $('#left-menu-profile').toggleClass('menu-header--expanded');
    }
  });

  cocktail.mixin(View, KeyboardEventsMixin);

  return View;

})();
