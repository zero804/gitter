"use strict";
var _ = require('underscore');
var Backbone = require('backbone');
var log = require('utils/log');

module.exports = (function() {


  /* Put your scrolling panels on rollers */
  function NeverEndingStory(target, options) {
    this._target = target;
    this._reverse = options && options.reverse;
    this._prevScrollTop = 0;
    this._prevScrollTime = Date.now();
    this._nearTop = false;
    this._nearBottom = false;
    this._scrollHandler = this.scroll.bind(this);
    this.scrollRateLimited = _.throttle(this.scrollRate.bind(this), 100, { leading: false });
    this._contentWrapper = options && options.contentWrapper;
    this.enable();
  }
  _.extend(NeverEndingStory.prototype, Backbone.Events, {
    scroll: function() {
      var target = this._target;

      var scrollTop = target.scrollTop;
      var scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

      var prevScrollTop = this._prevScrollTop;
      var prevScrollBottom = this._prevScrollBottom;

      this._prevScrollTop = scrollTop;
      this._prevScrollBottom = scrollBottom;

      var deltaTop = prevScrollTop - scrollTop;
      var deltaBottom = prevScrollBottom - scrollBottom;

      var halfClientHeight = target.clientHeight/2;
      var nearTop = scrollTop < halfClientHeight;
      var nearBottom = scrollBottom < halfClientHeight;

      if(deltaTop > 0 && nearTop) {
        /* We're scrolling towards the top */
        this.trigger('approaching.top');
      } else if(deltaBottom > 0 && nearBottom) {
        /* We're scrolling towards the bottom */
        this.trigger('approaching.bottom');
      }

      if(this._nearTop != nearTop) {
        this._nearTop = nearTop;
        this.trigger('near.top.changed', nearTop);
      }

      if(this._nearBottom != nearBottom) {
        this._nearBottom = nearBottom;
        this.trigger('near.bottom.changed', nearBottom);
      }

      this.scrollRateLimited();
    },

    scrollRate: function() {
      var target = this._target;

      var now = Date.now();
      var scrollTop = target.scrollTop;
      var scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

      var prevScrollTime = this._prevScrollTimeRate;
      var prevScrollTop = this._prevScrollTopRate;
      var prevScrollBottom = this._prevScrollBottomRate;

      this._prevScrollTopRate = scrollTop;
      this._prevScrollBottomRate = scrollBottom;
      this._prevScrollTimeRate = now;

      if(!prevScrollTime) return;

      var deltaTop = prevScrollTop - scrollTop;
      var deltaBottom = prevScrollBottom - scrollBottom;
      var timeDelta = now - prevScrollTime;
      var speed, timeToLimit;

      if(deltaTop > 0) {
        if(scrollTop > target.clientHeight) return;

        speed = deltaTop / timeDelta;
        timeToLimit = scrollTop / speed;
        if(timeToLimit < 600) {
          this.trigger('approaching.top');
        }
        return;
      }

      if(deltaBottom > 0) {
        if(scrollBottom > target.clientHeight) return;

        speed = deltaBottom / timeDelta;
        timeToLimit = scrollBottom / speed;

        if(timeToLimit < 600) {
          this.trigger('approaching.bottom');
        }
      }

    },

    scrollToOrigin: function() {
      var target = this._target;
      if(this._reverse) {
        var scrollTop = target.scrollHeight - target.clientHeight;
        target.scrollTop = scrollTop;
      } else {
        target.scrollTop = 0;
      }
    },

    enable: function() {
      var self = this;

      if(!this._enabled) {
        log.info('enabling scroll listener');
        this._target.addEventListener('scroll', this._scrollHandler, false);
        this._enabled = true;

        // If we have a content wrapper and it's smaller than the
        // client area, we need to load more content immediately
        if(this._contentWrapper) {
          setTimeout(function() {
            if(self._contentWrapper.offsetHeight < self._target.clientHeight) {
              self.trigger('approaching.top');
            }
          }, 10);
        }
      }
    },

    disable: function() {
      if(this._enabled) {
        log.info('disabling scroll listener');
        this._target.removeEventListener('scroll', this._scrollHandler, false);
        this._enabled = false;
      }

    }
  });


  return NeverEndingStory;

})();

