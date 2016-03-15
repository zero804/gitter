'use strict';

var Marionette                = require('backbone.marionette');
var Backbone                  = require('backbone');

var template                  = require('./tmpl/repoSelectView.hbs');
var itemTemplate              = require('./tmpl/repoItemView.hbs');


var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
  tagName: 'div'
});


var View = Marionette.CompositeView.extend({
  events: {
  },
  childView: ItemView,
  template: template,
  childViewContainer: '#list'
});
