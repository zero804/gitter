define([
  'backbone',
  'marionette',
  'jquery-hammer'
], function(Backbone, Marionette, $hammer) {
  "use strict";

  return Marionette.ItemView.extend({
    initialize: function(options) {
      this.$el = $hammer(this.$el).hammer();
      if(options.hideMenu) {
        this.$el.find('#showTroupesButton').hide();
      }
    },

    events: {
      'tap': 'tap',
      'touch #showTroupesButton': 'stopClickEvents',
      'tap #showTroupesButton': 'showHideTroupes'
    },

    tap: function() {
      this.makeAppFullScreen();
      this.$el.removeClass('partiallyOffScreen');
    },

    makeAppFullScreen: function() {
      Backbone.$('html, body').scrollTop(Backbone.$(document).height());
    },

    stopClickEvents: function(event) {
      event.gesture.preventDefault();
      event.stopPropagation();
    },

    showHideTroupes: function(event) {
      this.makeAppFullScreen();
      this.$el.toggleClass('partiallyOffScreen');
      event.stopPropagation();
    }

  });

});
