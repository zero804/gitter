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
  className: 'room-item',

  //TODO this is used in primary-collection-item-view
  //centralize it JP 22/1/16
  attributes: function (){
    var delay = (0.003125 * this.index);
    return {
      'style': 'transition-delay: ' + delay + 's',
    }
  },

  triggers: {
    'click': 'item:clicked',
  },

  constructor: function (attrs){
    this.index = attrs.index;
    Marionette.ItemView.prototype.constructor.apply(this, arguments);
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
    'change:searchTerm': 'onSearchTermChange',
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
  },

  buildChildView: function (model, ItemView, attrs){
    var index     = this.collection.indexOf(model);
    var viewIndex = (index + this.model.primaryCollection.length);
    return new ItemView(_.extend({}, attrs, {
      model: model,
      index: viewIndex,
    }))
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

  onSearchTermChange: function(model, val) { //jshint unused: true
    if(model.get('state') !== 'search') { return }
    this.$el.toggleClass('active', !val);
  },


  onBeforeRender: function (){
    RAF(function(){
      this.$el.removeClass('loaded');
    }.bind(this));
  },

  onRender: function (){
    setTimeout(function(){
      RAF(function(){
        this.$el.addClass('loaded');
      }.bind(this));
    }.bind(this), 10);
  },

});
