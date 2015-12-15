'use strict';

var Backbone              = require('backbone');
var Marionette            = require('backbone.marionette');
var appEvents             = require('utils/appevents');
var PanelHeaderView       = require('../header/header-view');
var PanelFooterView       = require('../footer/footer-view');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var SecondaryCollection   = require('../secondary-collection/secondary-collection-view');
var ProfileMenuView       = require('../profile/profile-menu-view');
var RAF                   = require('utils/raf');

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
      footer:              { el: '#panel-footer', init: 'initFooter'}
    },
  },

  initHeader: function(optionsForRegion) {
    return new PanelHeaderView(optionsForRegion({
      model:     this.model,
      userModel: this.model.userModel,
    }));
  },

  initFooter: function (optionsForRegion){
    /*
    return new PanelFooterView(optionsForRegion({
      model: this.model,
      bus:   this.bus,
    }));
    */
  },

  initProfileMenu: function(optionsForRegion) {
    return new ProfileMenuView(optionsForRegion({ model: this.model }));
  },

  initPrimaryCollection: function(optionsForRegion) {
    return new PrimaryCollectionView(optionsForRegion({
      collection: this.model.primaryCollection,
      model:      this.model,
      bus:        this.bus
    }));
  },

  initSecondaryCollection: function(optionsForRegion) {
    return new SecondaryCollection(optionsForRegion({
      collection: this.model.secondaryCollection,
      model:      this.model,
    }));
  },

  /* TODO PATCHED FROM RIGHT TOOLBAR */
  initSearch: function(optionsForRegion) {
    return new SearchView(optionsForRegion({ model: this.model }));
  },

  initSearchInput: function(optionsForRegion) {
    return new SearchInputView(optionsForRegion({ model: this.model }));
  },
  /* TODO PATCHED FROM RIGHT TOOLBAR */


  modelEvents: {
    'change:panelOpenState': 'onPanelOpenStateChange',
  },

  initialize: function(attrs) {
    this.bus = attrs.bus;

    this.listenTo(this.bus, 'ui:swipeleft', this.onSwipeLeft, this);
    this.listenTo(this.bus, 'focus.request.chat', this.onSearchItemSelected, this);

    this.$el.find('.nano').nanoScroller({
      iOSNativeScrolling: true,
      sliderMaxHeight:    200,
    });

    /* TODO PATCHED FROM RIGHT TOOLBAR */
    this.searchState = new Backbone.Model({
      searchTerm: '',
      active:     false,
      isLoading:  false
    });
    /* TODO PATCHED FROM RIGHT TOOLBAR */

  },

  onPanelOpenStateChange: function(model, val) { /*jshint unused: true */
    RAF(function() {
      this.$el.toggleClass('active', val);
    }.bind(this));
  },

  onSwipeLeft: function(e) {
    if (e.target === this.el) { this.model.set('panelOpenState', false); }
  },

  onSearchItemSelected: function (){
    this.model.set('panelOpenState', false);
  },

});
