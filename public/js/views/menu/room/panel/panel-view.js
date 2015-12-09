'use strict';

var Backbone              = require('backbone');
var Marionette            = require('backbone.marionette');
var appEvents             = require('utils/appevents');
var PanelHeaderView       = require('../header/header-view');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var SecondaryCollection   = require('../secondary-collection/secondary-collection-view');
var ProfileMenuView       = require('../profile/profile-menu-view');
var RAF                   = require('utils/raf');

var SearchView            = require('views/search/searchView');
var SearchInputView       = require('../search-input/search-input-view');

require('views/behaviors/isomorphic');
require('nanoscroller');

module.exports = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      header: { el: '#panel-header', init: 'initHeader'},
      profile: { el: '#profile-menu', init: 'initProfileMenu'},
      primaryCollection: { el: '#primary-collection', init: 'initPrimaryCollection' },
      secondaryCollection: { el: '#secondary-collection', init: 'initSecondaryCollection' },
      searchInput: { el: '#search-input', init: 'initSearchInput' },
      search: { el: '#search-results', init: 'initSearch' },
    },
  },

  initHeader: function(optionsForRegion) {
    return new PanelHeaderView(optionsForRegion({
      model: this.model,
      userModel: this.model.userModel,
    }));
  },

  initProfileMenu: function(optionsForRegion) {
    return new ProfileMenuView(optionsForRegion({ model: this.model }));
  },

  initPrimaryCollection: function(optionsForRegion) {
    return new PrimaryCollectionView(optionsForRegion({
      collection: this.model.primaryCollection,
      model: this.model,
      bus: this.bus
    }));
  },

  initSecondaryCollection: function(optionsForRegion) {
    return new SecondaryCollection(optionsForRegion({
      collection: this.model.secondaryCollection,
      model: this.model,
    }));
  },

  /* TODO PATCHED FROM RIGHT TOOLBAR */
  initSearch: function(optionsForRegion) {
    return new SearchView(optionsForRegion({ model: this.searchState }));
  },

  initSearchInput: function(optionsForRegion) {
    return new SearchInputView(optionsForRegion({ model: this.searchState }));
  },
  /* TODO PATCHED FROM RIGHT TOOLBAR */

  modelEvents: {
    'change:panelOpenState': 'onPanelOpenStateChange',
  },

  initialize: function(attrs) {
    this.bus = attrs.bus;
    appEvents.on('ui:swipeleft', this.onSwipeLeft, this);
    this.$el.find('.nano').nanoScroller({
      iOSNativeScrolling: true,
      sliderMaxHeight: 200,
    });

    /* TODO PATCHED FROM RIGHT TOOLBAR */
    this.searchState = new Backbone.Model({
      searchTerm: '',
      active: false,
      isLoading: false
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

});
