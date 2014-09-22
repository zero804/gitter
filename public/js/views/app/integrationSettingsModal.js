define([
  'marionette',
  'utils/context',
  'views/base',
  'hbs!./tmpl/integrationSettingsTemplate',
], function(Marionette, context, TroupeViews, template) {
  "use strict";

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
  });
