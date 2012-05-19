define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var MailView = Backbone.View.extend({
    el: '#mail',

    render: function() {

      return this;
    }

  });

  return MailView;

});
