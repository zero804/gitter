'use strict';

var Marionette = require('backbone.marionette');
var template = require('./secondary-collection-item-search-empty-view.hbs');

module.exports = Marionette.ItemView.extend({
  template: template,
  className: 'search-message-empty-container'
});
