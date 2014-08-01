define(['underscore', 'backbone', 'log!nes'], function(_, Backbone, log) {
  "use strict";

  /* Put your scrolling panels on rollers */
  function NeverEndingStory(target, options) {
    this._target = target;
    this._reverse = options && options.reverse;
    this._prevScrollTop = 0;
    this._prevScrollTime = Date.now();
    this._scrollHandler = this.scroll.bind(this);
    this.scrollRateLimited = _.throttle(this.scrollRate.bind(this), 100, { leading: false });
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

      if(deltaTop > 0) {
        /* We're scrolling towards the top */
        if(scrollTop < target.clientHeight/2) {
          // log('approaching.top (margin)');
          this.trigger('approaching.top');
        }
      } else if(deltaBottom > 0) {
        /* We're scrolling towards the bottom */
        if(scrollBottom < target.clientHeight/2) {
          // log('approaching.bottom (margin)');
          this.trigger('approaching.bottom');
        }
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

      if(!prevScrollTime || this.loading) return;

      var deltaTop = prevScrollTop - scrollTop;
      var deltaBottom = prevScrollBottom - scrollBottom;
      var timeDelta = now - prevScrollTime;
      var speed, timeToLimit;

      if(deltaTop > 0) {
        if(scrollTop > target.clientHeight) return;

        speed = deltaTop / timeDelta;
        timeToLimit = scrollTop / speed;
        if(timeToLimit < 600) {
          // log('approaching.top (rate)');
          this.trigger('approaching.top');
        }
        return;
      }

      if(deltaBottom > 0) {
        if(scrollBottom > target.clientHeight) return;

        speed = deltaBottom / timeDelta;
        timeToLimit = scrollBottom / speed;

        if(timeToLimit < 600) {
          // log('approaching.bottom (rate)');
          this.trigger('approaching.bottom');
        }
      }

    },

    loadComplete: function() {
      this.loading = false;
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
      if(!this._enabled) {
        log('enabling scroll listener');
        this._target.addEventListener('scroll', this._scrollHandler, false);
        this._enabled = true;
      }
    },

    disable: function() {
      if(this._enabled) {
        log('disabling scroll listener');
        this._target.removeEventListener('scroll', this._scrollHandler, false);
        this._enabled = false;
      }

    }
  });


  return NeverEndingStory;
});
