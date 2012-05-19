define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var ChatView = Backbone.View.extend({
    el: '#chat',

    render: function() {
      return this;
    }

  });

  return ChatView;

});
