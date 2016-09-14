'use strict';

var Marionette = require('backbone.marionette');
var parseForTemplate = require('gitter-web-shared/parse/forum-category-item');

var template = require('./category-item-view.hbs');

module.exports = Marionette.ItemView.extend({
  tagName: 'li',
  template: template,

  initialize: function() {

  },

  serializeData: function() {
    var data = parseForTemplate(this.model.toJSON());
    return data;
  },
});
