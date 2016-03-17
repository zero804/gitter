'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');

var template = require('./tmpl/explore-view.hbs');
var itemTemplate = require('../../../templates/partials/room_card.hbs');


var RoomCardView = Marionette.ItemView.extend({
  template: itemTemplate,
  tagName: 'div'
});


var ExploreView = Marionette.CompositeView.extend({
  events: {
  },
  childView: RoomCardView,
  template: template,
  childViewContainer: '.explore-room-card-list',
  initialize: function() {
    console.log('explore init');
  }
});

module.exports = ExploreView;
