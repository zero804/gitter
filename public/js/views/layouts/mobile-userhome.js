"use strict";

var Marionette = require('backbone.marionette');
var modalRegion = require('components/modal-region');
var UserhomeView = require('views/userhome/userHomeView');
var TroupeMenu = require('views/menu/troupeMenu');

var $ = require('jquery');
require('jquery-hammerjs');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  template: false,
  el: 'body',

  behaviors: {
    Isomorphic: {
      menu: { el: '#menu-region', init: 'initMenuRegion' },
      userhome: { el: '#userhome-region', init: 'initUserhomeRegion' }
    }
  },

  ui: {
    mainPage: '#mainPage',
    showTroupesButton: '#showTroupesButton'
  },

  events: {
    'tap': 'tap',
    'touch @ui.showTroupesButton': 'stopClickEvents',
    'tap @ui.showTroupesButton': 'showHideTroupes'
  },

  initialize: function() {
    this.dialogRegion = modalRegion;
  },

  onRender: function() {
    this.$el.hammer();
    this.ui.showTroupesButton.toggle(!this.options.hideMenu);
  },

  initMenuRegion: function(optionsForRegion) {
    return new TroupeMenu(optionsForRegion());
  },

  initUserhomeRegion: function(optionsForRegion) {
    return new UserhomeView(optionsForRegion());
  },

  tap: function() {
    this.makeAppFullScreen();
    this.ui.mainPage.removeClass('partiallyOffScreen');
  },

  makeAppFullScreen: function() {
    $('html, body').scrollTop($(document).height());
  },

  stopClickEvents: function(e) {
    e.gesture.preventDefault();
    e.stopPropagation();
  },

  showHideTroupes: function(e) {
    this.makeAppFullScreen();
    this.ui.mainPage.toggleClass('partiallyOffScreen');
    e.stopPropagation();
  }

});
