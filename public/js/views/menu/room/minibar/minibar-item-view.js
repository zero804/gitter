'use strict';

var _             = require('underscore');
var Marionette    = require('backbone.marionette');
var itemTemplate  = require('./minibar-item-view.hbs');
var getRoomAvatar = require('gitter-web-shared/avatars/get-room-avatar');

module.exports =  Marionette.ItemView.extend({
  tagName:      'li',
  template:     itemTemplate,
  modelEvents: {
    'change:unreadItems change:mentions change:activity': 'render',
    'change:active': 'onActiveStateUpdate',
  },
  events: {
    'click': 'onItemClicked',
  },
  attributes: function() {
    var type = this.model.get('type');

    //account for initial render
    var className = 'room-menu-options__item--' + type;
    if (this.model.get('active')) { className = className += ' active'; }

    return {
      'class':             className,
      'data-state-change': type,
    };
  },

  serializeData: function() {
    var data = this.model.toJSON();
    var activity = (data.mentions || data.unreadItems) ? false : data.activity;
    return _.extend({}, data, {
      isHome:      (data.type === 'all'),
      isSearch:    (data.type === 'search'),
      isFavourite: (data.type === 'favourite'),
      isPeople:    (data.type === 'people'),
      isOrg:       (data.type === 'org'),
      avatarUrl:   getRoomAvatar(data.name),
      activity:    activity,
    });
  },

  onItemClicked: function() {
    this.trigger('minibar-item:clicked', this.model);
  },

  onActiveStateUpdate: function(model, val) { //jshint unused: true
    this.el.classList.toggle('active', !!val);
  },

  onRender: function() {
    this.el.classList.toggle('active', !!this.model.get('active'));
  },

});

