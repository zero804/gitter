"use strict";
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var TroupeViews = require('views/base');
var template = require('./tmpl/integrationSettingsTemplate.hbs');

module.exports = (function() {


  var View = Marionette.ItemView.extend({
    template: template,

    serializeData: function() {
      return context.getTroupe();
    }
  });

  return TroupeViews.Modal.extend({
      initialize: function(options) {
        options.title = "Integration Settings";
        TroupeViews.Modal.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      }
    });
  
})();

