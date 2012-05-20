define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var MailView = Backbone.View.extend({
    el: '#mailitem',

    render: function() {
      return this;
    },

    close: function() {
      console.log("close miview");
      this.off();
    }

  });

  return MailView;

});
