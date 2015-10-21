"use strict";

var Marionette = require('backbone.marionette');
var context    = require('utils/context');
var ModalView  = require('./modal');
var template   = require('./tmpl/integration-settings-view.hbs');

var View = Marionette.ItemView.extend({
  template: template,

  serializeData: function() {
    return context.getTroupe();
  }
});

module.exports = ModalView.extend({
    initialize: function(options) {
      options.title = "Integration Settings";
      ModalView.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    }
  });
