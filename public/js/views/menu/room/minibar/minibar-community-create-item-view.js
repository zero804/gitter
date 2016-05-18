'use strict';

var _ = require('underscore');
var appEvents = require('utils/appevents');

var template = require('./minibar-community-create-item-view.hbs');
var ItemView = require('./minibar-item-view.js');

module.exports = ItemView.extend({
  template: template,

  initialize: function(attrs) {

  },

  onItemClicked: function() {
    appEvents.trigger('community-create-view:toggle', true);
  },

});
