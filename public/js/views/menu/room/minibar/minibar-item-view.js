'use strict';

var _                 = require('underscore');
var Marionette        = require('backbone.marionette');
var itemTemplate      = require('./minibar-item-view.hbs');
var resolveRoomAvatar = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var toggleClass       = require('utils/toggle-class');

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
    var id = (type === 'org') ? this.model.get('name') : type;

    return {
      'class':             className,
      'data-state-change': type,
      id:                  'minibar-' + id
    };
  },

  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      isHome:        (data.type === 'all'),
      isSearch:      (data.type === 'search'),
      isFavourite:   (data.type === 'favourite'),
      isPeople:      (data.type === 'people'),
      isOrg:         (data.type === 'org'),
      hasUnreadIndicators: (data.type === 'people' || data.type === 'org'),
      avatarSrcset:  resolveRoomAvatar({ uri: data.name }, 23)
    });
  },

  onItemClicked: function() {
    this.trigger('minibar-item:clicked', this.model);
  },

  onActiveStateUpdate: function(model, val) { //jshint unused: true
    toggleClass(this.el, 'active', !!val);
  },

  pulseIndicators: function() {
    var model = this.model;
    var hasIndicators = model.get('activity') > 0 || model.get('unreadItems') > 0 || model.get('mentions') > 0;

    if(hasIndicators) {
      // Re-trigger the pulse animation
      // 16ms is a good 60-fps number to trigger on which Firefox needs (requestAnimationFrame doesn't work for this)
      var unreadIndicatorElements = this.el.querySelectorAll('.room-menu-options__item__unread-items, .room-menu-options__item__mentions, .room-menu-options__item__activity');
      Array.prototype.forEach.call(unreadIndicatorElements, function(unreadIndicatorElement) {
      unreadIndicatorElement.style.animation = 'none';
        setTimeout(function() {
            unreadIndicatorElement.style.animation = '';
        }, 16);
      });
    }
  },

  onRender: function() {
    toggleClass(this.el, 'active', !!this.model.get('active'));
    this.pulseIndicators();
  },

});
