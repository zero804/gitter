// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!templates/profile/profile'
], function($, _, Backbone, template){
  var ProfileView = Backbone.View.extend({

    initialize: function() {
    },

    events: {
    },

    render: function() {
      var compiledTemplate = template({ });
      $(this.el).html(compiledTemplate);
      return this;
    }


  });

  return ProfileView;
});
