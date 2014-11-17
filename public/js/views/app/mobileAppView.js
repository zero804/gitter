"use strict";
var Marionette = require('marionette');
var $ = require('jquery');
require('jquery-hammerjs');

module.exports = (function() {


  return Marionette.ItemView.extend({
    ui: {
      showTroupesButton: '#showTroupesButton'
    },

    events: {
      'tap': 'tap',
      'touch @ui.showTroupesButton': 'stopClickEvents',
      'tap @ui.showTroupesButton': 'showHideTroupes'
    },

    initialize: function(options) {
      this.$el.hammer();
      if(options.hideMenu) {
        this.$el.find('#showTroupesButton').hide();
      }
    },

    tap: function() {
      this.makeAppFullScreen();
      this.$el.removeClass('partiallyOffScreen');
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
      this.$el.toggleClass('partiallyOffScreen');
      e.stopPropagation();
    }

  });


})();

