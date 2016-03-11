'use strict';

var Marionette = require('backbone.marionette');
var template   = require('./primary-collection-item-favourite-empty-view.hbs');

module.exports = Marionette.ItemView.extend({
  className: 'empty-favourite loaded',
  template:  template,
});
