define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var OneView = Backbone.View.extend({
    el: '#one',

    render: function() {
      return this;
    }

  });

  return OneView;

});
