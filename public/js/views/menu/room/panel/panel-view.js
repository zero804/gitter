'use strict';

var _                        = require('underscore');
var Marionette               = require('backbone.marionette');
var PanelHeaderView          = require('../header/header-view');
var PanelFooterView          = require('../footer/footer-view');
var PrimaryCollectionView    = require('../primary-collection/primary-collection-view');
var PrimaryCollectionModel   = require('../primary-collection/primary-collection-model');
var SecondaryCollectionView  = require('../secondary-collection/secondary-collection-view');
var SecondaryCollectionModel = require('../secondary-collection/secondary-collection-model');
var TertiaryCollectionView   = require('../tertiary-collection/tertiary-collection-view');
var TertiaryCollectionModel  = require('../tertiary-collection/tertiary-collection-model');
var ProfileMenuView          = require('../profile/profile-menu-view');
var RAF                      = require('utils/raf');

var SearchInputView       = require('views/menu/room/search-input/search-input-view');

require('views/behaviors/isomorphic');
require('nanoscroller');

module.exports = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      header:              { el: '#panel-header', init: 'initHeader' },
      profile:             { el: '#profile-menu', init: 'initProfileMenu' },
      searchInput:         { el: '#search-input', init: 'initSearchInput' },
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
    return new SearchInputView(optionsForRegion({ model: this.model }));
  },

  initPrimaryCollection: function(optionsForRegion) {
    return new PrimaryCollectionView(optionsForRegion({
      collection:    this.model.primaryCollection,
      model:         new PrimaryCollectionModel(null, { roomMenuModel: this.model }),
      roomMenuModel: this.model,
      bus:           this.bus,
      dndCtrl:       this.dndCtrl,
    }));
  },

  initSecondaryCollection: function(optionsForRegion) {
    return new SecondaryCollectionView(optionsForRegion({
      collection:        this.model.secondaryCollection,
      model:             new SecondaryCollectionModel({}, { roomMenuModel: this.model }),
      roomMenuModel:     this.model,
      primaryCollection: this.model.primaryCollection,
      bus:               this.bus,
      userModel:         this.model.userModel,
    }));
  },

  initTertiaryCollection: function(optionsForRegion) {
    return new TertiaryCollectionView(optionsForRegion({
      model:          new TertiaryCollectionModel({}, { roomMenuModel: this.model }),
      collection:     this.model.tertiaryCollection,
      roomMenuModel:  this.model,
      bus:            this.bus,
      roomCollection: this.model._roomCollection,
    }));
  },

  initFooter: function(optionsForRegion) {
    return new PanelFooterView(optionsForRegion({
      model: this.model,
      bus:   this.bus,
    }));
  },

  modelEvents: {
    'change:panelOpenState':       'onPanelOpenStateChange',
    'primary-collection:snapshot': 'onPrimaryCollectionSnapshot',
  },

  childEvents: {
    'render': 'onChildViewRender',
  },

  initialize: function(attrs) {
    this.bus     = attrs.bus;
    this.dndCtrl = attrs.dndCtrl;

    this.listenTo(this.bus, 'ui:swipeleft', this.onSwipeLeft, this);
    this.listenTo(this.bus, 'focus.request.chat', this.onSearchItemSelected, this);
    this.listenTo(this.bus, 'room-menu:keyboard:change-focus', this.onFocusChangeRequested, this);
    this.$el.find('#search-results').show();
  },

  onChildViewRender: _.debounce(function() {
    this._initNano({ iOSNativeScrolling: true, sliderMaxHeight: 200 });
  }, 50),

  _initNano: function(params) {
    this.$el.find('.nano').nanoScroller(params);
  },

  onPanelOpenStateChange: function(model, val) { /*jshint unused: true */
    RAF(function() {
      this.$el.toggleClass('active', val);
    }.bind(this));
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
    var self = this;

    var hasLoaded = false;

    //fetch the model data
    this.model.fetch({
      timeout: 1,
      success: function() {
        //ask for the next free frame
        RAF(function() {
          //show the menu
          if (hasLoaded) { return; }

          hasLoaded = true;
          self.$el.removeClass('loading');
        });
      },
    });

    var t = setTimeout(function() {
      clearTimeout(t);
      if (hasLoaded) { return; }

      hasLoaded = true;
      self.$el.removeClass('loading');
      this.model.set('state', 'all');
    }.bind(this), 3000);

  },

  onFocusChangeRequested: function(offset, type) { //jshint unused: true
    if (type) { return this._initNano({ scroll: type }); }

    this._initNano({ scrollTo: '[data-collection-index=' + offset + ']' });
  },

  onDestroy: function() {
    this.stopListening(this.bus);
  },

});
