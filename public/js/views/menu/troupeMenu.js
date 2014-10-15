define([
  'jquery',
  'marionette',
  'utils/context',
  'utils/appevents',
  'utils/is-mobile',
  'collections/instances/troupes',
  'views/menu/room-collection-view',
  './suggested-collection-view',
  'log!troupeMenu',
  'cocktail',
  'views/keyboard-events-mixin',
  'hbs!./tmpl/troupeMenu',
  'hbs!./tmpl/collection-wrapper-view',
  './searchView',
  './profileView',
  './orgCollectionView',
  'nanoscroller' //no ref
], function ($, Marionette, context, appEvents, isMobile, troupeCollections, RoomCollectionView, SuggestedCollectionView, log, cocktail, KeyboardEventsMixin, template, CollectionWrapperViewTemplate, SearchView, ProfileView, OrgCollectionView) {
  "use strict";

  // Reply back to the child iframe
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

    events: function() {
      var events = {
        'click #search-clear-icon': 'onSearchClearIconClick'
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
      // $(window).on('showSearch', function() {
      //   self.showSearch();
      // });
      // $(window).on('hideSearch', function() {
      //   self.hideSearch();
      // });

      this.selectedIndex = 0;
      // Keep track of conversation change to select the proper element
      appEvents.on('context.troupeId', function(id) {
        $('#recentTroupesList li').removeClass('selected');
        var index = self.getIndexForId(id);
        if (index) self.selectedIndex = index;
      });

      // nanoscroller has to be reset when regions are rerendered
      this.regionManager.forEach(function (region) {
        self.listenTo(region, 'show', function () {
          var $nano = this.$el.find('.nano');
          $nano.nanoScroller({ iOSNativeScrolling: true });
        });
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

    // WARNING THIS METHOD IS UNSAFE. Fix it
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

    // Navigation to previous or next conversation appears tricky as the list of recent conversations is sorted by date
    //
    // navigateToNext: function() {
    //   this.navigateTo(this.selectedIndex + 1);
    // },
    //
    // navigateToPrev: function() {
    //   this.navigateTo(this.selectedIndex - 1);
    // },

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

    /* the clear icon shouldn't be available at all times? */
    // onSearchClearIconClick: function() {
    //   $('#list-search-input').val('');
    //   this.hideSearch();
    // },

    // activateSearchList: function() {
    //   this.$el.find('#list-search-input').focus();
    // },

    toggleHeaderExpansion: function() {
      $('#left-menu-profile').toggleClass('menu-header--expanded');
    },

    // hideSearch: function() {
    //   this.$el.find('#list-search').hide();
    //   this.$el.find('#list-mega').show();
    // },

    // showSearch: function() {
    //   this.$el.find('#list-mega').hide();
    //   this.$el.find('#list-search').show();
    // }
  });

  cocktail.mixin(View, KeyboardEventsMixin);

  return View;
});
