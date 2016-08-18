"use strict";
var $ = require('jquery');
var _ = require('underscore');
var Marionette = require('backbone.marionette');
var context = require('../../../utils/context');
var appEvents = require('../../../utils/appevents');
var isMobile = require('../../../utils/is-mobile');
var troupeCollections = require('../../..collections/instances/troupes');
var FilteredSuggestedRoomCollection = require('../../..collections/suggested-rooms').Filtered;
var RoomCollectionView = require('./room-collection-view');
var SuggestedCollectionView = require('./suggested-collection-view');
var log = require('../../../utils/log');
var cocktail = require('backbone.cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var CollectionWrapperViewTemplate = require('./tmpl/collection-wrapper-view.hbs');
var ProfileView = require('./profileView');
var OrgCollectionView = require('./orgCollectionView');
var dataSet = require('../../../utils/dataset-shim');
var toggle = require('../../../utils/toggle');

require('views/behaviors/isomorphic');
require('views/behaviors/tooltip');

var apiClient = require('../../../components/apiClient');

require('nanoscroller');

require('gitter-styleguide/css/components/buttons.css');



var SUGGESTED_ROOMS_THRESHOLD = 10; // non inclusive

module.exports = (function () {

  // Reply back to the child iframe - used in search
  appEvents.on('troupeRequest', function (payload, evt) { // jshint unused:true
    var msg = { child_window_event: ['troupesResponse', troupeCollections.troupes] };
    evt.source.postMessage(JSON.stringify(msg), evt.origin);
  });

  // wraps a view to give us more control of when to display it or not
  var CollectionWrapperView = Marionette.LayoutView.extend({

    behaviors: function(){
      var result ={
        Isomorphic: {
          list: {
            el: "#list",
            init: function(optionsForRegion) {
              return new this.options.childView(optionsForRegion({ collection: this.collection }));
            }
          }
        }
      };

      if (this.options.handleHide) {
        /* Tack a tooltip on too */
        result.Tooltip = {
            '.js-hide': { title: 'Hide forever' }
        };
      }

      return result;
    },

    ui: {
      hide: '.js-hide',
    },

    events: {
      'click @ui.hide': 'onHideClicked'
    },

    template: CollectionWrapperViewTemplate,

    collectionEvents: {
      'sync add reset remove': 'display'
    },

    serializeData: function () {
      var options = this.options;
      return {
        canHide: typeof options.handleHide === 'function',
        header: options.header
      };
    },

    onBeforeRender: function() {
      var options = this.options;
      if (options.prerendered && !this.isRendered) {
        // Don't hide the wrapper if the item has been prerendered on
        // the server as the client collection may not yet be populated
        // and the user will see a flash until the server side collection
        // has been loaded
        return;
      }
      this.display();
    },

    onHideClicked: function() {
      if (this.options.handleHide) this.options.handleHide();
    },

    display: function () {
      /* Only display when there are items */
      toggle(this.el, !!this.collection.length);
    }
  });

  var View = Marionette.LayoutView.extend({
    className: 'menu',
    selectedListIcon: "icon-troupes",

    ui: {
      nano: '.nano',
      recentListItems: '#recentTroupesList li' // TODO: this is nasty!
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

    behaviors: {
      Isomorphic: {
        profile: {
          el: "#profile-region",
          init: function(optionsForRegion) {
            return new ProfileView(optionsForRegion({}, { rerender: true }));
          }
        },
        favs: {
          el: "#favs-region",
          init: function(optionsForRegion) {
            // This listener affects favs and recents...
            this.listenTo(troupeCollections.troupes, 'add remove', this.initNanoScrollerThrottled);

            return new RoomCollectionView(optionsForRegion({
              collection: troupeCollections.favourites,
              draggable: true,
              dropTarget: true,
              roomsCollection: troupeCollections.troupes
            }));
          }
        },
        recents: {
          el: "#recents-region",
          init: function(optionsForRegion) {
            return new RoomCollectionView(optionsForRegion({
              collection: troupeCollections.recentRoomsNonFavourites,
              draggable: true,
              dropTarget: true,
              roomsCollection: troupeCollections.troupes,
            }));
          }
        },
        orgs: {
          el: "#orgs-region",
          init: function(optionsForRegion) {
            this.listenTo(troupeCollections.orgs, 'add remove', this.initNanoScrollerThrottled);

            return new CollectionWrapperView(optionsForRegion({
              collection: troupeCollections.orgs,
              childView: OrgCollectionView,
              header: 'Your Organisations',
              prerendered: true
            }));

          }
        }
      }
    },

    regions: {
      suggested: "#suggested-region"
    },

    initialize: function () {
      // this.bindUIElements();
      // this.initHideListeners = _.once(_.bind(this.initHideListeners, this));
      this.repoList = false;
      this.selectedIndex = 0;

      // TODO: build a behavior to handle this declaratively
      this.listenTo(appEvents, 'menu:hide', this.hideMenu);
      this.listenTo(appEvents, 'menu:show', this.showMenu);
      this.listenTo(appEvents, 'navigation', this.onNavigation);
      this.listenTo(appEvents, 'troupeUnreadTotalChange', this.updateUnread);
      this.listenTo(appEvents, 'context.troupeId', this.troupeContextChanged);

      // determining whether we should show the suggested rooms or not
      var hasItems = troupeCollections.troupes && !!(troupeCollections.troupes.length);

      if (hasItems) {
        this.showSuggestedRooms();
      } else {
        this.listenToOnce(troupeCollections.troupes, 'sync', function() {
          this.showSuggestedRooms();
        });
      }

      this.initNanoScrollerThrottled = _.throttle(this.initNanoScroller, 100, { leading: false });
    },

    onNavigation: function (){
      return (isMobile()) ? this.hideMenu() : this.showMenu();
    },

    initNanoScroller: function() {
      this.ui.nano.nanoScroller({ iOSNativeScrolling: true });
    },

    showSuggestedRooms: function() {
      if (this.suggested && this.suggested.hasView()) return;

      var suggestedRoomsHidden = context().suggestedRoomsHidden;

      if (suggestedRoomsHidden || troupeCollections.troupes.length >= SUGGESTED_ROOMS_THRESHOLD) return;

      var collection = this.suggestedRoomsCollection;
      if (!collection) {
        collection = this.suggestedRoomsCollection = new FilteredSuggestedRoomCollection({ roomsCollection: troupeCollections.troupes });

        // For now, only fetch the suggested rooms once
        if (context.getTroupeId()) {
          collection.fetchForRoom();
        } else {
          this.listenToOnce(appEvents, 'context.troupeId', function() {
            collection.fetchForRoom();
          });
        }

        this.listenTo(collection, 'add remove reset', this.initNanoScrollerThrottled);
      }

      var suggestedWrapperView = new CollectionWrapperView({
        collection: collection,
        childView: SuggestedCollectionView,
        header: 'Suggested Rooms',
        handleHide: function () {
          apiClient.user
            .put('/settings/suggestedRoomsHidden', { value: true })
            .then(function () {
              collection.reset();
            })
            .catch(function (err) {
              log.error(err);
            });
        }
      });

      this.showChildView('suggested', suggestedWrapperView);
    },

    showMenu: function() {
      this.$el.removeClass('menu--collapsed');
    },

    hideMenu: function() {
      this.$el.addClass('menu--collapsed');
    },

    updateUnread: function(values) {
      var unreadText = values.overall || ' ';
      this.$el.find('#menu-tab-unread-count').text(unreadText);
    },

    troupeContextChanged: function(id) {
      this.ui.recentListItems.removeClass('selected'); // TODO: so nasty. Fix
      var index = this.getIndexForId(id);
      if (index) this.selectedIndex = index;
    },

    // FIXME: WARNING -> THIS METHOD IS UNSAFE.
    getIndexForId: function(id) {
      if (!id) return;
      var els = this.ui.recentListItems;
      for (var i = 0; i < els.length; i++) {
        if (dataSet.get(els[i], 'id') === id) return i;
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
      var itemElements = this.ui.recentListItems;
      if (i >= 0 && i < itemElements.length) {
        this.selectedIndex = i;
        itemElements.removeClass('selected');
        $(itemElements[this.selectedIndex]).addClass('selected'); // TODO: send a message to the control!
      }
    },

    navigateToCurrent: function () {
      var itemElements = this.ui.recentListItems;
      itemElements.removeClass('selected');
      $(itemElements[this.selectedIndex]).click(); // TODO: send a message to the control!
    },

    navigateTo: function (i) {
      var itemElements = this.ui.recentListItems;
      if (i >= 0 && i < itemElements.length) {
        this.selectedIndex = i;
        $(itemElements[i]).click(); // TODO: send a message to the control!
      }
    },

    navigateToRoom: function (e, handler) { //jshint unused:true
      var keys = handler.key.split('+');
      var key = keys[ keys.length - 1 ];
      if (key === '0') return this.navigateTo(9);
      var index = parseInt(key, 10) - 1;
      this.navigateTo(index);
    },

    serializeData: function() {
      return {
        showFooterButtons: !isMobile(),
        showExapandedHeader: isMobile(),
        showUnreadTab: !isMobile()
      };
    },

    onRender: function () {
      this.initNanoScroller();
    }
  });

  cocktail.mixin(View, KeyboardEventsMixin);

  return View;

})();
