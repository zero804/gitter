/*jshint unused:strict, browser:true */

define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!templates/status/status'
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
