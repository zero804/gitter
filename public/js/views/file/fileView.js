// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/file/file.mustache'
], function($, _, Backbone, Mustache, template){
  var FileView = Backbone.View.extend({    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    }
    
  });

  return FileView;
});
