'use strict';

var Marionette            = require('backbone.marionette');
var appEvents             = require('utils/appevents');
var PanelHeaderView       = require('../header/header-view');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var ProfileMenuView       = require('../profile/profile-menu-view');
var SearchInputView       = require('../search-input/search-input-view');

module.exports = Marionette.LayoutView.extend({

  modelEvents: {
    'change:panelOpenState': 'onPanelOpenStateChange'
  },

  initialize: function() {

    this.header = new PanelHeaderView({ el: '#panel-header', model: this.model });
    this.header.render();

    this.profileMenu = new ProfileMenuView({ el: '#profile-menu', model: this.model });
    this.primaryCollectionView = new PrimaryCollectionView({
      el: '#primary-collection',
      collection: this.model.primaryCollection,
      model: this.model
    });
    this.primaryCollectionView.render();

    this.searchInputView = new SearchInputView({
      el: '#search',
      model: this.model
    });
    this.searchInputView.render();

    appEvents.on('ui:swipeleft', this.onSwipeLeft, this);
  },

  onPanelOpenStateChange: function(model, val) { /*jshint unused: true */
    this.$el.toggleClass('active', val);
  },

  onSwipeLeft: function(e) {
    if(e.target === this.el) { this.model.set('panelOpenState', false); }
  },

});
