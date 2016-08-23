'use strict';

var template = require('./minibar-community-create-item-view.hbs');
var ItemView = require('./minibar-item-view');

module.exports = ItemView.extend({
  template: template,

  initialize: function(attrs) {
    this.roomMenuModel = attrs.roomMenuModel;
  },

  onItemClicked: function() {
    window.location.hash = '#createcommunity';
  },

});
