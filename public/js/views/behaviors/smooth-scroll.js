"use strict";
var Marionette = require('marionette');
var behaviourLookup = require('./lookup');
var _ = require('underscore');
var unreadBannerModel = require('../app/unreadBannerModel');
var context = require('utils/context');
var realtime = require('components/realtime');

var Behavior = Marionette.Behavior.extend({
  defaults: {
    scrollElementSelector: null,
    contentWrapper: null
  },

  initialize: function() {
    var selector = this.options.scrollElementSelector;
    var wrapperSelector = this.options.contentWrapper;

    this.scrollElement = selector ? document.querySelector(selector) : this.view.el;
    this.wrapper = wrapperSelector ? this.scrollElement.querySelector(wrapperSelector) : null;

    this.lazyDecorator      = _.debounce(this.decorateIfVisible.bind(this), 500);
    this.lazyTracker        = _.debounce(this.trackViewport.bind(this), 500);
    this.lazyPointerEvents  = _.debounce(this.enablePointerEvents.bind(this), 250);
    this.lazyUnreadItems    = _.throttle(this.updateUnreadBanners.bind(this), 250);

    this.scrollHandler = this.smoothScroll.bind(this);
    this.scrollElement.addEventListener('scroll', this.scrollHandler, false);

    setTimeout(this.decorateIfVisible.bind(this), 100);
    setTimeout(this.updateUnreadBanners.bind(this), 100);

    var subscription = '/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId() + '/unreadItems';
    realtime.subscribe(subscription, this.updateUnreadBanners.bind(this));
  },

  decorateIfVisible: function() {
    this.view.children.each(function(child) {
      if (this.viewportStatus(child.el) === 'visible') child.trigger('messageInViewport');
    }.bind(this));
  },

  updateUnreadBanners: function() {
    var items = {'visible': 0, 'above': 0, 'below': 0};
    this.view.children.each(function(child) {
      var pos = this.viewportStatus(child.el);
      if (child.model.get('unread')) items[pos] += 1;
    }.bind(this));

    unreadBannerModel.set('unreadAbove', items.above);
    unreadBannerModel.set('unreadBelow', items.below);
  },

  viewportStatus: function(el) {
    var rect = el.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)) return 'visible';
    if (rect.top >= 0 && rect.bottom >= (window.innerHeight || document.documentElement.clientHeight)) return 'below';
    if (rect.top <= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)) return 'above';
  },

  trackViewport: function() {
    this.view.triggerMethod('trackViewportCenter');
  },

  disablePointerEvents: function() {
    if (this.wrapper && !this.wrapper.classList.contains('disable-hover'))
      this.wrapper.classList.add('disable-hover');
  },

  enablePointerEvents: function() {
    if (this.wrapper)
      this.wrapper.classList.remove('disable-hover');
  },

  smoothScroll: function() {
    this.disablePointerEvents();
    this.lazyDecorator();
    this.lazyTracker();
    this.lazyPointerEvents();
    this.lazyUnreadItems();
  },

  onClose: function() {
    this.scrollElement.removeEventListener('scroll', this.scrollHandler, false);
  }
});

behaviourLookup.register('SmoothScroll', Behavior);
module.exports = Behavior;
