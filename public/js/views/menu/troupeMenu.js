define([
  'jquery',
  'marionette',
  'utils/context',
  'utils/appevents',
  'utils/is-mobile',
  'collections/instances/troupes',
  'views/menu/troupeCollectionView',
  'log!troupeMenu',
  'cocktail',
  'views/keyboard-events-mixin',
  'hbs!./tmpl/troupeMenu',
  './searchView',
  './profileView',
  './orgCollectionView',
  'nanoscroller' //no ref
], function($, Marionette, context, appEvents, isMobile, troupeCollections, TroupeCollectionView, log, cocktail, KeyboardEventsMixin, template, SearchView, ProfileView, OrgCollectionView) {
  "use strict";

  var View = Marionette.Layout.extend({
    className: 'menu',
    template: template,
    selectedListIcon: "icon-troupes",

    regions: {
      profile: "#left-menu-profile",
      recent: "#list-recents",
      favs: "#list-favs",
      search: "#left-menu-list-search",
      orgs: "#left-menu-list-orgs"
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
      $(window).on('showSearch', function() {
        self.showSearch();
      });
      $(window).on('hideSearch', function() {
        self.hideSearch();
      });

      this.selectedIndex = 0;
      // Keep track of conversation change to select the proper element
      appEvents.on('context.troupeId', function(id) {
        $('#recentTroupesList li').removeClass('selected');
        var index = self.getIndexForId(id);
        if (index) self.selectedIndex = index;
      });
    },

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
        showSearch: !isMobile(),
        showExapandedHeader: isMobile()
      };
    },

    onRender: function() {

      this.profile.show(new ProfileView());

      // mega-list: recent troupe view
      this.favs.show(new TroupeCollectionView({
        collection: troupeCollections.favourites,
        rerenderOnSort: true,
        draggable: true,
        dropTarget: true,
        roomsCollection: troupeCollections.troupes
      }));

      this.recent.show(new TroupeCollectionView({
        collection: troupeCollections.recentRoomsNonFavourites,
        rerenderOnSort: true,
        draggable: true,
        dropTarget: true,
        roomsCollection: troupeCollections.troupes
      }));

      // search results collection view
      this.searchView = new SearchView({ troupes: troupeCollections.troupes, $input: this.$el.find('#list-search-input') });
      this.search.show(this.searchView);

      // Organizations collection view
      this.orgs.show(new OrgCollectionView({ collection: troupeCollections.orgs }));

      // nanoscroller has to be reset when regions are rerendered
      var $nano = this.$el.find('.nano');
      this.regionManager.forEach(function(region) {
        region.currentView.on('render', function() {
          $nano.nanoScroller({ iOSNativeScrolling: true });
          if(window.navigator.userAgent.indexOf('Chrome/37.') >= 0) {
            // chrome 37 bug: https://code.google.com/p/chromium/issues/detail?id=408705
            // causes nanoscroller bug: https://github.com/jamesflorentino/nanoScrollerJS/issues/255
            $nano.find('.nano-content').css('right', '0');
          }
        });
      });

    },
    /* the clear icon shouldn't be available at all times? */
    onSearchClearIconClick: function() {
      $('#list-search-input').val('');
      this.hideSearch();
    },

    activateSearchList: function() {
      this.$el.find('#list-search-input').focus();
    },

    toggleHeaderExpansion: function() {
      $('#left-menu-profile').toggleClass('menu-header--expanded');
    },

    hideSearch: function() {
      this.$el.find('#list-search').hide();
      this.$el.find('#list-mega').show();
    },

    showSearch: function() {
      this.$el.find('#list-mega').hide();
      this.$el.find('#list-search').show();
    },

  });

  cocktail.mixin(View, KeyboardEventsMixin);

  return View;
});
