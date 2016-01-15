'use strict';

var _                       = require('underscore');
var Marionette              = require('backbone.marionette');
var PanelHeaderView         = require('../header/header-view');
var PanelFooterView         = require('../footer/footer-view');
var PrimaryCollectionView   = require('../primary-collection/primary-collection-view');
var SecondaryCollectionView = require('../secondary-collection/secondary-collection-view');
var ProfileMenuView         = require('../profile/profile-menu-view');
var RAF                     = require('utils/raf');

var SearchView            = require('views/menu/room/search-results/search-results-view');
var SearchInputView       = require('views/menu/room/search-input/search-input-view');

require('views/behaviors/isomorphic');
require('nanoscroller');

module.exports = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      header:              { el: '#panel-header', init: 'initHeader'},
      profile:             { el: '#profile-menu', init: 'initProfileMenu'},
      primaryCollection:   { el: '#primary-collection', init: 'initPrimaryCollection' },
      secondaryCollection: { el: '#secondary-collection', init: 'initSecondaryCollection' },
      searchInput:         { el: '#search-input', init: 'initSearchInput' },
      search:              { el: '#search-results', init: 'initSearch' },
      footer:              { el: '#panel-footer', init: 'initFooter'},
    },
  },

  initHeader: function(optionsForRegion) {
    return new PanelHeaderView(optionsForRegion({
      model:     this.model,
      userModel: this.model.userModel,
    }));
  },

  initFooter: function(optionsForRegion) {
    return new PanelFooterView(optionsForRegion({
      model: this.model,
      bus:   this.bus,
    }));
  },

  initProfileMenu: function(optionsForRegion) {
    return new ProfileMenuView(optionsForRegion({ model: this.model }));
  },

  initPrimaryCollection: function(optionsForRegion) {
    return new PrimaryCollectionView(optionsForRegion({
      collection: this.model.primaryCollection,
      model:      this.model,
      bus:        this.bus,
      dndCtrl:    this.dndCtrl,
    }));
  },

  initSecondaryCollection: function(optionsForRegion) {
    return new SecondaryCollectionView(optionsForRegion({
      collection: this.model.secondaryCollection,
      model:      this.model,
      bus:        this.bus,
    }));
  },

  initSearch: function(optionsForRegion) {
    return new SearchView(optionsForRegion({ model: this.model }));
  },

  initSearchInput: function(optionsForRegion) {
    return new SearchInputView(optionsForRegion({ model: this.model }));
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

  //when the primary collection's snapshot is received
  //fetch the model data from local storage
  //remove the loading class that obscures the menu
  onPrimaryCollectionSnapshot: function() {
    var self = this;

    //fetch the model data
    this.model.fetch({
      success: function() {
        //ask for the next free frame
        RAF(function() {
          //show the menu
          self.$el.removeClass('loading');
        });
      },
    });

  },

  onFocusChangeRequested: function(offset, type) { //jshint unused: true
    if (type) { return this._initNano({ scroll: type }); }

    this._initNano({ scrollTo: '[data-collection-index=' + offset + ']'});
  },

});
