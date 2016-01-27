'use strict';

var Marionette            = require('backbone.marionette');
var _                     = require('underscore');
var template              = require('./secondary-collection-view.hbs');
var itemTemplate          = require('./secondary-collection-item-view.hbs');
var RAF                   = require('utils/raf');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var roomNameShortener     = require('../../../../utils/room-menu-name-shortener');
var getRoomAvatar         = require('utils/get-room-avatar');

var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
  className: 'room-item',

  //TODO this is used in primary-collection-item-view
  //centralize it JP 22/1/16
  attributes: function() {
    var delay = (0.003125 * this.index);
    return {
      'style': 'transition-delay: ' + delay + 's',
    };
  },

  triggers: {
    'click': 'item:clicked',
  },

  constructor: function(attrs) {
    this.index = attrs.index;
    Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

  serializeData: function() {
    var data = this.model.toJSON();

    //When recent searches are rendered the models have an avatarUrl of null,
    //this is because we want to hide the avatar image ONLY in this case
    //as such we have this check here jp 25/1/16
    if(data.avatarUrl !== null){
      data.avatarUrl = (data.avatarUrl || getRoomAvatar(data.name || data.uri || ' '));
    }

    return _.extend({}, data, {
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
    'change:secondaryCollectionActive': 'onModelChangeSecondaryActiveState',
    'change:searchTerm':                'onSearchTermChange',
    'change:secondaryCollectionHeader': 'render',
    'change:state':                     'render'
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
  },

  buildChildView: function(model, ItemView, attrs) {
    var index     = this.collection.indexOf(model);
    var viewIndex = (index + this.primaryCollection.length);
    return new ItemView(_.extend({}, attrs, {
      model: model,
      index: viewIndex,
    }));
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
    this.primaryCollection = attrs.primaryCollection;
  },

  filter: function(model, index) {//jshint unused: true
    return (index <= 10);
  },

  onModelChangeSecondaryActiveState: function(model, val) { /*jshint unused: true*/
    this.render();
    RAF(function() {
      this.$el.toggleClass('active', val);
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

  onSearchTermChange: function(model, val) { //jshint unused: true
    if (model.get('state') !== 'search') { return; }

    this.$el.toggleClass('active', !val);
  },

  onBeforeRender: function() {
    RAF(function() {
      this.$el.removeClass('loaded');
    }.bind(this));
  },

  onRender: function() {
    setTimeout(function() {
      RAF(function() {
        this.$el.addClass('loaded');
      }.bind(this));
    }.bind(this), 10);
  },

});
