'use strict';

var appEvents = require('utils/appevents');
var template = require('./minibar-community-create-item-view.hbs');
var ItemView = require('./minibar-item-view');

module.exports = ItemView.extend({
  template: template,

  initialize: function() {

  },

  onItemClicked: function() {
    appEvents.trigger('community-create-view:toggle', true);
  },

});
