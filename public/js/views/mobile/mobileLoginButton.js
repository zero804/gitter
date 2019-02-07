'use strict';
var Marionette = require('backbone.marionette');
var template = require('./tmpl/mobileLoginButton.hbs');

module.exports = (function() {
  return Marionette.ItemView.extend({
    template: template
  });
})();
