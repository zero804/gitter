'use strict';

var Marionette = require('backbone.marionette');
var template = require('./primary-collection-item-favourite-empty-view.hbs');

module.exports = Marionette.ItemView.extend({
  id:        'empty-view',
  className: 'empty-favourite loaded',
  template:  template,
});
