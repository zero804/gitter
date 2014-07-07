define(['underscore', 'backbone', 'log!nes'], function(_, Backbone, log) {
  "use strict";

  /* Put your scrolling panels on rollers */
  function NeverEndingStory(target, options) {
    this._target = target;
    this._reverse = options && options.reverse;
    this._prevScrollTop = 0;
    this._prevScrollTime = Date.now();
    this._scrollHandler = this.scroll.bind(this);
    this.enable();
  }
  _.extend(NeverEndingStory.prototype, Backbone.Events, {
    scroll: function() {
      var now = Date.now();
      var st = this._reverse ? this._target.scrollTop : this._target.scrollHeight - this._target.scrollTop - this._target.clientHeight;

      var delta = st - this._prevScrollTop;
      var timeDelta = now - this._prevScrollTime;

      this._prevScrollTop = st;
      this._prevScrollTime = now;

      if(this.loading) return;

      var timeToLimit;
      if(delta < 0) {
        var gradient = delta / timeDelta;
        timeToLimit = st / -gradient;
      }

      if((timeToLimit < 300) || (st < 50 && delta < 0)) {
        log('approaching end');

        this.loading = true;
        this.trigger('approaching.end');
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
