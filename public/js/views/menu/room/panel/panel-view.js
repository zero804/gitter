'use strict';

var _                               = require('underscore');
var Marionette                      = require('backbone.marionette');
var fastdom                         = require('fastdom');
var appEvents                       = require('gitter-web-appevents');
var toggleClass                     = require('utils/toggle-class');
var PanelHeaderView                 = require('../header/header-view');
var PanelFooterView                 = require('../footer/footer-view');
var FavouriteCollectionView         = require('../favourite-collection/favourite-collection-view');
var FavouriteCollectionModel        = require('../favourite-collection/favourite-collection-model');
var PrimaryCollectionView           = require('../primary-collection/primary-collection-view');
var PrimaryCollectionModel          = require('../primary-collection/primary-collection-model');
var SecondaryCollectionView         = require('../secondary-collection/secondary-collection-view');
var SecondaryCollectionModel        = require('../secondary-collection/secondary-collection-model');
var TertiaryCollectionView          = require('../tertiary-collection/tertiary-collection-view');
var TertiaryCollectionModel         = require('../tertiary-collection/tertiary-collection-model');
var ProfileMenuView                 = require('../profile/profile-menu-view');
var FilteredFavouriteRoomCollection = require('../../../../collections/filtered-favourite-room-collection.js');
var SearchInputView                 = require('views/menu/room/search-input/search-input-view');

require('views/behaviors/isomorphic');

var PanelView = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      header:              { el: '#panel-header', init: 'initHeader' },
      profile:             { el: '#profile-menu', init: 'initProfileMenu' },
      searchInput:         { el: '#search-input', init: 'initSearchInput' },
      favouriteCollection: { el: '#favourite-collection', init: 'initFavouriteCollection' },
      primaryCollection:   { el: '#primary-collection', init: 'initPrimaryCollection' },
      secondaryCollection: { el: '#secondary-collection', init: 'initSecondaryCollection' },
      teritaryCollection:  { el: '#tertiary-collection', init: 'initTertiaryCollection' },
      footer:              { el: '#panel-footer', init: 'initFooter' },
    },
  },


  initHeader: function(optionsForRegion) {
    return new PanelHeaderView(optionsForRegion({
      model:     this.model,
      userModel: this.model.userModel,
    }));
  },

  initProfileMenu: function(optionsForRegion) {
    return new ProfileMenuView(optionsForRegion({ model: this.model }));
  },

  initSearchInput: function(optionsForRegion) {
    return new SearchInputView(optionsForRegion({ model: this.model, bus: this.bus }));
  },

  initFavouriteCollection: function (optionsForRegion) {
    return new FavouriteCollectionView(optionsForRegion({
      collection:     this.favCollection,
      model:          this.favouriteCollectionModel,
      roomMenuModel:  this.model,
      bus:            this.bus,
      dndCtrl:        this.dndCtrl,
      roomCollection: this.model._roomCollection,
    }));

  },

  initPrimaryCollection: function(optionsForRegion) {
    return new PrimaryCollectionView(optionsForRegion({
      collection:     this.model.primaryCollection,
      model:          this.primaryCollectionModel,
      roomMenuModel:  this.model,
      bus:            this.bus,
      dndCtrl:        this.dndCtrl,
      roomCollection: this.model._roomCollection,
    }));
  },

  initSecondaryCollection: function(optionsForRegion) {
    return new SecondaryCollectionView(optionsForRegion({
      collection:        this.model.secondaryCollection,
      model:             this.secondaryCollectionModel,
      roomMenuModel:     this.model,
      bus:               this.bus,
      roomCollection:    this.model._roomCollection,
      primaryCollection: this.model.primaryCollection,
      userModel:         this.model.userModel,
      troupeModel:       this.model._troupeModel,
    }));
  },

  initTertiaryCollection: function(optionsForRegion) {
    return new TertiaryCollectionView(optionsForRegion({
      model:               this.tertiaryCollectionModel,
      collection:          this.model.tertiaryCollection,
      roomMenuModel:       this.model,
      bus:                 this.bus,
      primaryCollection:   this.model.primaryCollection,
      secondaryCollection: this.model.secondaryCollection,
      roomCollection:      this.model._roomCollection,
    }));
  },

  initFooter: function(optionsForRegion) {
    return new PanelFooterView(optionsForRegion({
      model: this.model,
      bus:   this.bus,
    }));
  },

  ui: {
    profileMenu: '#profile-menu'
  },

  events: {
    mouseenter: 'onMouseenter'
  },

  modelEvents: {
    'change:panelOpenState':       'onPanelOpenStateChange',
    'primary-collection:snapshot': 'onPrimaryCollectionSnapshot',
    'change:profileMenuOpenState': 'onProfileToggle'
  },

  childEvents: {
    render: 'onChildViewRender',
  },

  initialize: function(attrs) {
    this.bus     = attrs.bus;
    this.dndCtrl = attrs.dndCtrl;
    this.keyboardControllerView = attrs.keyboardControllerView;

    //Sadly the favourite collection needs to be generated here rather than the room-menu-model
    //because it has a dependency on the dnd-controller JP 1/4/16
    this.favCollection = new FilteredFavouriteRoomCollection({
      collection: this.model._roomCollection,
      roomModel:  this.model,
      dndCtrl:    this.dndCtrl,
    });

    this.favouriteCollectionModel = new FavouriteCollectionModel(null, {
      collection: this.favCollection,
      roomMenuModel: this.model
    });
    this.primaryCollectionModel = new PrimaryCollectionModel(null, {
      collection: this.model.primaryCollection,
      roomMenuModel: this.model
    });
    this.secondaryCollectionModel = new SecondaryCollectionModel({}, {
      collection: this.model.secondaryCollection,
      roomMenuModel: this.model
    });
    this.tertiaryCollectionModel = new TertiaryCollectionModel({}, {
      collection: this.model.tertiaryCollection,
      roomMenuModel: this.model
    });

    this.keyboardControllerView.inject(this.keyboardControllerView.constants.ROOM_LIST_KEY, [
      {
        collection: this.favCollection,
        getActive: function() {
          return this.favouriteCollectionModel.get('active');
        }.bind(this)
      },
      {
        collection: this.model.primaryCollection,
        getActive: function() {
          return  this.primaryCollectionModel.get('active');
        }.bind(this)
      },
      {
        collection: this.model.secondaryCollection,
        getActive: function() {
          return  this.secondaryCollectionModel.get('active');
        }.bind(this)
      },
      {
        collection: this.model.tertiaryCollection,
        getActive: function() {
          return  this.tertiaryCollectionModel.get('active');
        }.bind(this)
      }
    ]);


    this.listenTo(this.bus, 'ui:swipeleft', this.onSwipeLeft, this);
    this.listenTo(this.bus, 'focus.request.chat', this.onSearchItemSelected, this);
    this.$el.find('#search-results').show();
  },

  onChildViewRender: _.debounce(function() {
    this._initNano({ iOSNativeScrolling: true, sliderMaxHeight: 200 });
  }, 50),

  _initNano: function(params) {
    fastdom.mutate(function() {
      this.$el.find('.nano').nanoScroller(params);
    }.bind(this));
  },

  onPanelOpenStateChange: function(model, val) { /*jshint unused: true */
    fastdom.mutate(function() {
      toggleClass(this.el, 'active', val);
    }.bind(this));
  },

  onMouseenter: function() {
    // If they are able to touch the main room-list panel, then we always stay open
    this.model.set('panelOpenState', true);
  },

  onSwipeLeft: function(e) {
    if (e.target === this.el) { this.model.set('panelOpenState', false); }
  },

  onSearchItemSelected: function() {
    if (!this.model.get('roomMenuIsPinned')) {
      this.model.set('panelOpenState', false);
    }
  },

  onPrimaryCollectionSnapshot: function() {
    this.el.classList.add('loading');
  },

  onChildRender: _.debounce(function (){
    this.bus.trigger('panel:render');
  }, 10),


  onProfileToggle: function(model, val) { //jshint unused: true
    this.ui.profileMenu[0].setAttribute('aria-hidden', !val);
  },

  onRender: function() {
    this.ui.profileMenu[0].setAttribute('aria-hidden', !this.profileMenuOpenState);
  },

  onDestroy: function() {
    this.stopListening(this.bus);
  },
});


module.exports = PanelView;
