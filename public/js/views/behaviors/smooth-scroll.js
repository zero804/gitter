"use strict";
var Marionette = require('marionette');
var behaviourLookup = require('./lookup');
var _ = require('underscore');

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

    this.scrollHandler = this.smoothScroll.bind(this);
    this.scrollElement.addEventListener('scroll', this.scrollHandler, false);
  },

  decorateIfVisible: function() {
    this.view.children.each(function(child) {
      if (this.isElementInViewport(child.el)) child.trigger('decorate');
    }.bind(this));
  },

  isElementInViewport: function(el) {
    var rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
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
  },

  onClose: function() {
    this.scrollElement.removeEventListener('scroll', this.scrollHandler, false);
  }
});

behaviourLookup.register('SmoothScroll', Behavior);
module.exports = Behavior;
