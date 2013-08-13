/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(['underscore', 'backbone'], function(_, Backbone) {
  "use strict";

  /* Put your scrolling panels on rollers */
  function NeverEndingStory(target) {
    this._target = target;
    this._prevScrollTop = 0;
    this._prevScrollTime = Date.now();
    this._scrollHandler = _.debounce(this.scroll.bind(this), 10);
    target.addEventListener('scroll', this._scrollHandler, false);
  }
  _.extend(NeverEndingStory.prototype, Backbone.Events, {
    scroll: function() {
      var now = Date.now();
      var st = this._target.scrollTop;

      var delta = st - this._prevScrollTop;
      var timeDelta = now - this._prevScrollTime;

      this._prevScrollTop = st;
      this._prevScrollTime = now;

      if(this.loading) return;

      var timeToTop;
      if(delta < 0) {
        var gradient = delta / timeDelta;
        timeToTop = st / -gradient;
      }


      if(timeToTop && timeToTop < 300 || (st < 20 && delta > 0)) {
        this.loading = true;
        this.trigger('approaching.end');
      }
    },

    loadComplete: function() {
      this.loading = false;
    },

    disable: function() {
      this._target.removeEventListener('scroll', this._scrollHandler, false);
    }
  });


  return NeverEndingStory;
});