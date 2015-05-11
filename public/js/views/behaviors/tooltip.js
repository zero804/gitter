"use strict";
// var $ = require('jquery');
// var _ = require('underscore');
var Marionette = require('marionette');
var behaviourLookup = require('./lookup');
var matchesSelector = require('utils/matches-selector');
var RAF = require('utils/raf');

require('bootstrap_tooltip');

var Behavior = Marionette.Behavior.extend({
  onRender: function() {
    if (window._troupeCompactView) return;
    if (!this.tooltips) this.tooltips = {};
    if (!this.handlers) this.handlers = {};

    var self = this;

    Object.keys(this.options).forEach(function(selector) {
      if (self.handlers[selector]) return; // Already listening
      if (self.tooltips[selector]) return; // Already has a tooltip

      var $el = selector === '' ? self.$el : self.$el.find(selector);
      var el = $el[0];
      if (!el) return; // Cannot find element? Don't continue

      var handler = self.createHandler($el, el, selector);
      el.addEventListener('mouseover', handler, false);
      self.handlers[selector] = handler;
    });
  },

  createHandler: function($el, el, selector) {
    var self = this;

    return {
      el: el,
      handleEvent: function() {
        el.removeEventListener('mouseover', this, false);
        delete self.handlers[selector];

        self.initTooltip(selector, $el, el);
      }
    };
  },

  initTooltip: function(selector, $el, el) {
    var tooltipOptions = this.options[selector];

    var title;
    if (tooltipOptions.titleFn) {
      title = this.view[tooltipOptions.titleFn].bind(this.view);
    } else {
      title = tooltipOptions.title;
    }

    this.tooltips[selector] = $el;
    $el.tooltip({
      html: tooltipOptions.html,
      title: title,
      placement : tooltipOptions.placement,
      container: tooltipOptions.container || 'body'
    });

    RAF(function() {
      if (!matchesSelector(el, ':hover')) return;

      // Force a mouseover event to wake up the tooltip
      var evt = new MouseEvent("mouseover");
      el.dispatchEvent(evt);
    });

  },

  onClose: function() {
    var handlers = this.handlers;
    delete this.handlers;

    var tooltips = this.tooltips;
    delete this.tooltips;

    if (!handlers) return; // Never rendered

    // Remove handlers
    Object.keys(handlers).forEach(function(selector) {
      var handler = handlers[selector];
      var el = handler.el;
      el.removeEventListener('mouseover', handler, false);
    });

    // Remove tooltips
    Object.keys(tooltips).forEach(function(selector) {
      var $el = tooltips[selector];
      $el.tooltip('destroy');
    });
  }

});


behaviourLookup.register('Tooltip', Behavior);

module.exports = Behavior;
