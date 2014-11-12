"use strict";
var Marionette = require('marionette');
var template = require('./tmpl/mobileLoginButton.hbs');

module.exports = (function() {


  return Marionette.ItemView.extend({
    template: template
  });

})();

