'use strict';

var Marionette = require('backbone.marionette');
var template = require('./primary-collection-item-all-empty-view.hbs');

module.exports = Marionette.ItemView.extend({
  id:        'empty-view',
  className: 'empty-all loaded',
  template:  template,
});
