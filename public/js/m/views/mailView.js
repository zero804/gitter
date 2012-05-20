define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var MailView = Backbone.View.extend({
    el: '#mail',

    render: function() {

      return this;
    },

    close: function() {
      console.log("close mailview");
      this.off();
    }

  });

  return MailView;

});
