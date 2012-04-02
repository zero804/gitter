// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/profile/profile.mustache'
], function($, _, Backbone, Mustache, template){
  var ProfileView = Backbone.View.extend({
  
    initialize: function() {
    },
    
    events: {
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    }
    
    
  });

  return ProfileView;
});
