"use strict";

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var template = require('templates/status/status.hbs');

module.exports = (function() {


  var StatusView = Backbone.View.extend({
    render: function() {
      var compiledTemplate = template({ });
      $(this.el).html(compiledTemplate);
      return this;
    }

  });

  return StatusView;

})();

