define([
       'underscore',
       'backbone'
], function(_, Backbone){

  var FileView = Backbone.View.extend({
    el: '#file',

    render: function() {
      return this;
    },

    close: function() {
      console.log("close fileview");
      this.off();
    }

  });

  return FileView;

});
