'use strict';

var Marionette = require('backbone.marionette');
var template = require('./footer-view.hbs');

module.exports = Marionette.ItemView.extend({
  template: template,
  className: 'panel-footer'
});
