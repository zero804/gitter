/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'backbone',
  'jquery_effect_highlight'
], function($, _, Backbone, _highlight) {
  return Backbone.View.extend({
    initialize: function(options) {
      this.notificationCount = this.$el.find('.label-notification');
      var c = options.initialUnreadCount;
      if(c > 0) {
        this.notificationCount.text(c);
        this.notificationCount.show();
      } else {
        this.notificationCount.hide();
      }
    },

    events: {
    },

    updateNotificationValue: function(value) {
      var c = value > 0 ? value : 0;

      this.notificationCount.text(c ? c : "");

      if(!this.currentValue && c) {
        this.notificationCount.show('fast');
      } else if(this.currentValue && !c) {
        this.notificationCount.hide('fast');
      }

      if(c > this.currentValue) {
        this.$el.effect('highlight', {}, 600);
      }

      this.currentValue = c;

    },


    incrementNotificationValue: function() {
      this.updateNotificationValue(this.currentValue ? this.currentValue + 1 : 1);
    }
  });

});
