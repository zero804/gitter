'use strict';

var Marionette            = require('backbone.marionette');
var _                     = require('underscore');
var template              = require('./secondary-collection-view.hbs');
var itemTemplate          = require('./secondary-collection-item-view.hbs');
var RAF                   = require('utils/raf');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var roomNameShortener     = require('../../../../utils/room-menu-name-shortener');

var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
  className: 'room-item--secondary',
  triggers: {
    'click': 'item:clicked',
  },
  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      //TODO trim this if its too long JP 8/1/16
      name: roomNameShortener((data.name || data.uri)),
    });
  },
});

module.exports = Marionette.CompositeView.extend({
  childView: ItemView,
  childViewContainer: '#secondary-collection-list',
  template: template,
  className: 'secondary-collection',

  modelEvents: {
    'change:state': 'onModelChangeState',
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
  },

  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      isSearch: (data.state === 'search'),
    });
  },

  initialize: function(attrs) {
    //TODO test this JP 8/1/16
    this.bus = attrs.bus;
  },

  filter: function(model, index) {//jshint unused: true
    return (index <= 10);
  },

  onModelChangeState: function(model, val) { /*jshint unused: true*/
    this.render();
    RAF(function() {
      this.$el.toggleClass('active', (val === 'search' || val === 'org'));
    }.bind(this));
  },

  onItemClicked: function(view) {
    if (this.model.get('state') === 'search') {
      return this.model.set('searchTerm', view.model.get('name'));
    }

    //TODO this seems kinda sucky, is there a better way to do this?
    //JP 8/1/16
    PrimaryCollectionView.prototype.onItemClicked.apply(this, arguments);
  },

});
