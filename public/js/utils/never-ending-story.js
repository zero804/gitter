define(['underscore', 'backbone', 'log!nes'], function(_, Backbone, log) {
  "use strict";

  /* @const */
  var ABSOLUTE_MARGIN = 50;
  var IGNORE_MARGIN = 500;

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
      var target = this._target;

      var now = Date.now();
      var scrollTop = target.scrollTop;
      var scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

      // var st = this._reverse ? target.scrollTop : target.scrollHeight - target.scrollTop - target.clientHeight;
      var prevScrollTime = this._prevScrollTime;
      var prevScrollTop = this._prevScrollTop;
      var prevScrollBottom = this._prevScrollBottom;

      this._prevScrollTop = scrollTop;
      this._prevScrollBottom = scrollBottom;
      this._prevScrollTime = now;

      if(!prevScrollTime || this.loading) return;

      var deltaTop = prevScrollTop - scrollTop;
      var deltaBottom = prevScrollBottom - scrollBottom;
      var timeDelta = now - prevScrollTime;

      if(deltaTop > 0) {
        /* We're scrolling towards the top */
        if(scrollTop < ABSOLUTE_MARGIN || (scrollTop < IGNORE_MARGIN && (scrollTop * timeDelta/deltaTop < 300))) {
          log('approaching.top');
          this.trigger('approaching.top');
        }
      } else if(deltaBottom > 0) {
        /* We're scrolling towards the bottom */
        if(scrollBottom < ABSOLUTE_MARGIN || (scrollBottom < IGNORE_MARGIN && (scrollBottom * timeDelta/deltaBottom < 300))) {
          log('approaching.bottom');
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
