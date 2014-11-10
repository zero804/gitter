define([
  'marionette',
  './tmpl/mobileLoginButton.hbs'
], function(Marionette, template) {
  "use strict";

  return Marionette.ItemView.extend({
    template: template
  });
});
