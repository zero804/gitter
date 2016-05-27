'use strict';

var Marionette = require('backbone.marionette');
var template = require('./tertiary-collection-item-search-empty-view.hbs');

module.exports = Marionette.ItemView.extend({
  id:        'empty-view',
  className: 'empty-search loaded',
  template:  template,
});
