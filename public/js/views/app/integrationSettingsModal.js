"use strict";
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var ModalView = require('views/modal');
var template = require('./tmpl/integrationSettingsTemplate.hbs');

module.exports = (function() {


  var View = Marionette.ItemView.extend({
    template: template,

    serializeData: function() {
      return context.getTroupe();
    }
  });

  return ModalView.extend({
      initialize: function(options) {
        options.title = "Integration Settings";
        ModalView.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      }
    });

})();
