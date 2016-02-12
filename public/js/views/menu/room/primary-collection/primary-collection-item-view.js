'use strict';

var _                 = require('underscore');
var Backbone          = require('backbone');
var getRoomAvatar     = require('utils/get-room-avatar');
var itemTemplate      = require('./primary-collection-view.hbs');
var roomNameShortener = require('../../../../utils/room-menu-name-shortener');
var apiClient         = require('components/apiClient');
var context           = require('utils/context');
var appEvents         = require('utils/appevents');

var BaseCollectionItemView = require('../base-collection/base-collection-item-view');

module.exports = BaseCollectionItemView.extend({

  template: itemTemplate,
  events: {
    'click [data-component=room-item-options-toggle]': 'onOptionsClicked',
    'click [data-component="room-item-hide"]':         'onHideClicked',
    'click [data-component="room-item-leave"]':        'onLeaveClicked',
    'mouseleave':                                      'onMouseOut',
  },

  className: null,
  attributes: function() {
    return {
      class:     (this.model.get('githubType') === 'ONETOONE') ? 'room-item--one2one' : 'room-item',
      'data-id': this.model.get('id'),
    };
  },

  initialize: function() {
    this.uiModel = new Backbone.Model({ menuIsOpen: false });
    this.listenTo(this.uiModel, 'change:menuIsOpen', this.onModelToggleMenu, this);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.url = (data.url || '');
    data.name = (data.name || '');

    //For user results
    if (data.displayName) {
      return _.extend({}, { name: data.displayName, avatarUrl: data.avatarUrlSmall });
    }

    var hasMentions  = !!data.mentions && data.mentions;
    var unreadItems  = !hasMentions && data.unreadItems;
    var lurkActivity = data.lurk && (!hasMentions && !unreadItems) && !!data.activity;

    return _.extend({}, data, {
      avatarUrl: getRoomAvatar(data.url.substring(1)),
      isNotOneToOne: (data.githubType !== 'ONETOONE'),
      name:          roomNameShortener(data.name),
      mentions:      hasMentions,
      unreadItems:   unreadItems,
      lurkActivity:  lurkActivity,
      isSearch:      (this.roomMenuModel.get('state') === 'search'),
    });
  },

  onOptionsClicked: function(e) {
    e.stopPropagation();
    if (this.roomMenuModel.get('state') === 'search') { return; }

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

  render: function() {
    //TODO Figure out why there is soooo much rendering JP 5/2/16
    if (!Object.keys(this.model.changed)) { return; }

    BaseCollectionItemView.prototype.render.apply(this, arguments);
  },

  onDestroy: function() {
    this.stopListening(this.uiModel);
  },
});
