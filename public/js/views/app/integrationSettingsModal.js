define([
  'utils/context',
  'views/base',
  'hbs!./tmpl/integrationSettingsTemplate',
], function(context, TroupeViews, template) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    getRenderData: function() {
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
