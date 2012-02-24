// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/status/status.mustache'
], function($, _, Backbone, Mustache, template){
  var StatusView = Backbone.View.extend({    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    }
    
  });

  return StatusView;
});
