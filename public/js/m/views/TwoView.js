define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var TwoView = Backbone.View.extend({
    el: '#two',

    render: function() {
      return this;
    }

  });

  return TwoView;

});
