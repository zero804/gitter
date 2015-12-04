'use strict';

var Marionette            = require('backbone.marionette');
var appEvents             = require('utils/appevents');
var PanelHeaderView       = require('../header/header-view');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var ProfileMenuView       = require('../profile/profile-menu-view');
var SearchInputView       = require('../search-input/search-input-view');
var RAF                   = require('utils/raf');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      header: { el: '#panel-header', init: 'initHeader'},
      profile: { el: '#profile-menu', init: 'initProfileMenu'},
      primaryCollection: { el: '#primary-collection', init: 'initPrimaryCollection' },
      search: { el: '#search', init: 'initSearchInput' },
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
    }));
  },

  initSearchInput: function(optionsForRegion) {
    return new SearchInputView(optionsForRegion({ model: this.model }));
  },

  modelEvents: {
    'change:panelOpenState': 'onPanelOpenStateChange',
  },

  initialize: function() {
    appEvents.on('ui:swipeleft', this.onSwipeLeft, this);
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
