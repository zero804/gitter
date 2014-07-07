define([
  'marionette',
  'hbs!./tmpl/mobileLoginButton'
], function(Marionette, template) {
  "use strict";

  return Marionette.ItemView.extend({
    template: template
  });
});
