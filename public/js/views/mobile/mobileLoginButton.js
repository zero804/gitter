/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'hbs!./tmpl/mobileLoginButton'
], function(Marionette, template) {
  "use strict";

  return Marionette.ItemView.extend({
    template: template
  });
});
