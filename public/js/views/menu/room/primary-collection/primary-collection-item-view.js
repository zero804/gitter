'use strict';

var _                 = require('underscore');
var Backbone          = require('backbone');
var Marionette        = require('backbone.marionette');
var getRoomAvatar     = require('utils/get-room-avatar');
var itemTemplate      = require('./primary-collection-view.hbs');
var roomNameShortener = require('../../../../utils/room-menu-name-shortener');
var apiClient         = require('components/apiClient');
var context           = require('utils/context');
var appEvents         = require('utils/appevents');

module.exports = Marionette.ItemView.extend({

  className: 'room-item',

  template: itemTemplate,

  attributes: function() {
    var delay = (0.003125 * this.index);
    return {
      'data-room-id': this.model.get('id'),
      'style': 'transition-delay: ' + delay + 's',
      'data-collection-index': this.index,
    };
  },

  events: {
    'click [data-component=room-item-options-toggle]': 'onOptionsClicked',
    'click [data-component="room-item-hide"]':         'onHideClicked',
    'click [data-component="room-item-leave"]':        'onLeaveClicked',
    'mouseleave':                                      'onMouseOut',
  },

  modelEvents: {
    'change:selected':    'onSelectedChange',
    'change:focus':       'onItemFocused',
    'change:unreadItems': 'render',
    'change:mentions':    'render',
  },

  triggers: {
    'click': 'item:clicked',
  },

  constructor: function(attrs) {
    this.index = attrs.index;
    this.uiModel = new Backbone.Model({ menuIsOpen: false });
    Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

  initialize: function() {
    this.listenTo(this.uiModel, 'change:menuIsOpen', this.onModelToggleMenu, this);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.url = (data.url || '');
    data.name = (data.name || '');
    return _.extend({}, data, {
      roomAvatarUrl: getRoomAvatar(data.url.substring(1)),
      isNotOneToOne: (data.githubType !== 'ONETOONE'),
      name:          roomNameShortener(data.name),
    });
  },

  onOptionsClicked: function(e) {
    e.stopPropagation();
    this.uiModel.set('menuIsOpen', !this.uiModel.get('menuIsOpen'));
  },

  onModelToggleMenu: function(model, val) {// jshint unused: true
    this.$el.toggleClass('active', val);
  },

  onMouseOut: function() {
    this.uiModel.set('menuIsOpen', false);
  },

  onHideClicked: function() {
    //TODO figure out why this throws an error.
    //implementation is exactly the same as on develop?
    //JP 13/1/16
    apiClient.user.delete('/rooms/' + this.model.id);
  },

  onLeaveClicked: function() {
    if (this.model.get('id') === context.getTroupeId()) {
      appEvents.trigger('about.to.leave.current.room');
    }

    apiClient.delete('/v1/rooms/' + this.model.get('id') + '/users/' + context.getUserId())
      .then(function() {
        appEvents.trigger('navigation', '/home', 'home', '');
      });
  },

  onSelectedChange: function(model, val) { //jshint unused: true
    this.$el.children(':first').toggleClass('selected', !!val);
  },

  onItemFocused: function(model, val) {//jshint unused: true
    this.$el.children(':first').toggleClass('focus', !!val);
  },
});
