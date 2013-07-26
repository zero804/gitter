define(['backbone', 'jquery-hammer'], function(Backbone, $hammer) {
  return Backbone.View.extend({

    initialize: function() {
      this.$el = $hammer(this.$el).hammer();
    },

    events: {
      'tap': 'tap',
      'tap #showTroupesButton': 'showHideTroupes'
    },

    tap: function() {
      this.makeAppFullScreen();
      this.$el.removeClass('partiallyOffScreen');
    },

    makeAppFullScreen: function() {
      Backbone.$('html, body').scrollTop(Backbone.$(document).height());
    },

    showHideTroupes: function(event) {
      this.makeAppFullScreen();
      this.$el.toggleClass('partiallyOffScreen');
      event.stopPropagation();
    }

  });

});
