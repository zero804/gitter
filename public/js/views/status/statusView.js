
define([
  'jquery',
  'underscore',
  'backbone',
  'templates/status/status.hbs'
], function($, _, Backbone, template){
  "use strict";

  var StatusView = Backbone.View.extend({
    render: function() {
      var compiledTemplate = template({ });
      $(this.el).html(compiledTemplate);
      return this;
    }

  });

  return StatusView;
});
