'use strict';

var Backbone          = require('backbone');
var Marionette        = require('backbone.marionette');
var getRoomAvatar     = require('utils/get-room-avatar');
var itemTemplate      = require('./primary-collection-view.hbs');
var _                 = require('underscore');
var roomNameShortener = require('../../../../utils/room-menu-name-shortener');

module.exports = Marionette.ItemView.extend({

  className: 'room-item',

  template: itemTemplate,

  attributes: function() {
    var delay = (0.003125 * this.index);
    return {
      'data-room-id': this.model.get('id'),
      'style': 'transition-delay: ' + delay + 's'
    };
  },

  events: {
    'click [data-component=room-item-options-toggle]': 'onOptionsClicked',
    'mouseleave': 'onMouseOut'
  },

  triggers: {
    'click': 'item:clicked',
  },

  constructor: function (attrs){
    this.index = attrs.index;
    this.uiModel = new Backbone.Model({ menuIsOpen: false });
    Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

  initialize: function (){
    this.listenTo(this.uiModel, 'change:menuIsOpen', this.onModelToggleMenu, this);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      roomAvatarUrl: getRoomAvatar(data.name),
      isNotOneToOne: (data.githubType !== 'ONETOONE'),
      name:          roomNameShortener(data.name)
    });
  },

  onOptionsClicked: function (e){
    e.stopPropagation();
    this.uiModel.set('menuIsOpen', !this.uiModel.get('menuIsOpen'));
  },

  onModelToggleMenu: function (model, val){// jshint unused: true
    this.$el.toggleClass('active', val);
  },

  onMouseOut: function (){
    this.uiModel.set('menuIsOpen', false);
  },

});

