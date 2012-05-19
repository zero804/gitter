define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var FileView = Backbone.View.extend({
    el: '#file',

    render: function() {
      return this;
    }

  });

  return FileView;

});
