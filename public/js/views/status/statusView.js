// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!templates/status/status'
], function($, _, Backbone, template){
  var StatusView = Backbone.View.extend({
    render: function() {
      var compiledTemplate = template({ });
      $(this.el).html(compiledTemplate);
      return this;
    }

  });

  return StatusView;
});
