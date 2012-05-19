define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var PopupView = Backbone.View.extend({
    el: '#popup',

    render: function() {
      return this;
    }

  });

  return PopupView;

});
