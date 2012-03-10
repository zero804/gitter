// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/home/main.mustache'
], function($, _, Backbone, Mustache, template){
  var MainHomeView = Backbone.View.extend({    
    events: {
      "click .share":          "shareClicked"
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    },
    
    shareClicked: function() {
      window.troupeApp.showShareDialog();
    }
    
  });

  return MainHomeView;
});
