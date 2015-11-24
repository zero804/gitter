"use strict";

var Marionette = require('backbone.marionette');
var modalRegion = require('components/modal-region');
var UserhomeView = require('views/userhome/userHomeView');

var $ = require('jquery');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  template: false,
  el: 'body',

  behaviors: {
    Isomorphic: {
      userhome: { el: '#userhome-region', init: 'initUserhomeRegion' }
    }
  },

  ui: {
    mainPage: '#mainPage',
    showTroupesButton: '#showTroupesButton'
  },

  events: {
    'click @ui.mainPage': 'hideTroupes',
    'click @ui.showTroupesButton': 'showHideTroupes'
  },

  initialize: function() {
    this.dialogRegion = modalRegion;
  },

  onRender: function() {
    this.ui.showTroupesButton.toggle(!this.options.hideMenu);
  },

  initUserhomeRegion: function(optionsForRegion) {
    return new UserhomeView(optionsForRegion());
  },

  hideTroupes: function() {
    this.makeAppFullScreen();
    this.ui.mainPage.removeClass('partiallyOffScreen');
  },

  makeAppFullScreen: function() {
    $('html, body').scrollTop($(document).height());
  },

  showHideTroupes: function(e) {
    this.makeAppFullScreen();
    this.ui.mainPage.toggleClass('partiallyOffScreen');
    e.stopPropagation();
  }

});
