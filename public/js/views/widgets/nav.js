define([
  'jquery',
  'underscore',
  'backbone',
  'jqueryui'
], function($, _, Backbone) {
  return Backbone.View.extend({
    initialize: function(options) {
      this.notificationCount = this.$el.find('.label-notification');
      this.notificationCount.hide();
    },

    events: {
      //"click .trpPersonRemove": "removeUser"
    },

    updateNotificationValue: function(value) {
      this.notificationCount.text(value);
      if(!this.currentValue && value) {
        this.notificationCount.show('fast');
      } else if(this.currentValue && !value) {
        this.notificationCount.hide('fast');
      }

      this.currentValue = value;
      this.$el.effect('highlight', {}, 600);
    },


    incrementNotificationValue: function() {
      this.updateNotificationValue(this.currentValue ? this.currentValue + 1 : 1);
    },

    removeUser: function() {
      window.alert("Blah!");
    }
  });

});
