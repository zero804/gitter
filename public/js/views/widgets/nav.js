define([
  'jquery',
  'underscore',
  'backbone',
  'jqueryui'
], function($, _, Backbone) {
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
      //"click .trpPersonRemove": "removeUser"
    },

    updateNotificationValue: function(value) {
      var c = value > 0 ? value : 0;

      this.notificationCount.text(c ? c : "");

      if(!this.currentValue && c) {
        this.notificationCount.show('fast');
      } else if(this.currentValue && !c) {
        this.notificationCount.hide('fast');
      }

      this.currentValue = c;

      if(c > this.currentValue) {
        this.$el.effect('highlight', {}, 600);
      }
    },


    incrementNotificationValue: function() {
      this.updateNotificationValue(this.currentValue ? this.currentValue + 1 : 1);
    }
  });

});
