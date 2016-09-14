'use strict';

var Marionette = require('backbone.marionette');
var ItemView = require('./category-item-view');

var template = require('./topics-area-view.hbs');

var TopicsAreaView = Marionette.CompositeView.extend({
  className: 'left-menu-topics-area-inner',
  template: template,
  childView: ItemView,
  childViewContainer: '.js-left-menu-topics-category-list',

  initialize: function() {

  },

});


module.exports = TopicsAreaView;
