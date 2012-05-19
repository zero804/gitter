define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var MailView = Backbone.View.extend({
    el: '#mailitem',

    render: function() {
      return this;
    }

  });

  return MailView;

});
