/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(['log!rollers','./legacy-mutations'], function(log, LegacyMutations) {
  "use strict";

  /** @const */ var TRACK_BOTTOM = 1;
  /** @const */ var TRACK_NO_PASS = 2;
  /** @const */ var STABLE = 3;

  /** Number of pixels we need to be within before we say we're at the bottom */
  /** @const */ var BOTTOM_MARGIN = 30;

  /* Put your scrolling panels on rollers */
  function Rollers(target) {
    this._target = target;
    this._mutationHandlers = {};
    this._mutationHandlers[TRACK_BOTTOM] = this.updateTrackBottom.bind(this);
    this._mutationHandlers[TRACK_NO_PASS] = this.updateTrackNoPass.bind(this);
    this._mutationHandlers[STABLE] = this.updateStableTracking.bind(this);

    this._nopass = null;
    this._stableElement = null;
    this._mode = TRACK_BOTTOM;

    var adjustScroll = this.adjustScroll.bind(this);
    // create an observer instance
    var MutationObserver = window.MutationObserver || window.MozMutationObserver || window.WebKitMutationObserver || LegacyMutations;
    var observer = new MutationObserver(adjustScroll);

    target.addEventListener('scroll', this.trackLocation.bind(this), false);
    window.addEventListener('resize', adjustScroll, false);
    window.addEventListener('focusin', adjustScroll, false);
    window.addEventListener('focusout', adjustScroll, false);

    // pass in the target node, as well as the observer options
    observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  }

  function continuous(cb, ms) {
    var until = Date.now() + ms;
    var timer = setInterval(function() {
      if(Date.now() >= until) {
        clearInterval(timer);
      }
      cb();
    }, 20);
  }

  Rollers.prototype = {
    adjustScroll: function() {
      console.log('adjustScroll', this._mode)
      this._mutationHandlers[this._mode]();
      this._postMutateTop = this._target.scrollTop;
      return true;
    },

    adjustScrollContinuously: function(ms) {
      continuous(this.adjustScroll.bind(this), ms);
    },

    /* Specify an element that should not be scrolled past */
    trackUntil: function(element) {
      console.log('track until', element);
      // if(this._mode != STABLE) {
        this._nopass = element;
        this._mode = TRACK_NO_PASS;
      // }
    },

    cancelTrackUntil: function() {
      if(!this._nopass) return;

      this._nopass = null;

      var target = this._target;

      if(this.isScrolledToBottom()) {
        this._mode = TRACK_BOTTOM;
      } else {
        this._mode = STABLE;

        this._stableElement = this.getBottomMostVisibleElement();

        // TODO: check that the element is within the targets DOM heirachy
        var scrollBottom = target.scrollTop + target.clientHeight;
        var stableElementTop = this._stableElement.offsetTop - target.offsetTop;

        // Calculate an record the distance of the stable element to the bottom of the view
        this._stableElementFromBottom = scrollBottom - stableElementTop;

      }

    },

    isScrolledToBottom: function() {
      var target = this._target;
      var atBottom = target.scrollTop >= target.scrollHeight - target.clientHeight - BOTTOM_MARGIN;
      return atBottom;
    },

    /*
     * Update the scroll position to follow the bottom of the scroll pane
     */
    updateTrackBottom: function() {
      console.log('updateTrackBottom');
      var target = this._target;
      var scrollTop = target.scrollHeight - target.clientHeight;
      target.scrollTop = scrollTop;
    },

    /*
     * Scroll to the bottom and switch the mode to TRACK_BOTTOM
     */
    scrollToBottom: function() {
      var target = this._target;
      var scrollTop = target.scrollHeight - target.clientHeight;
      target.scrollTop = scrollTop;

      delete this._nopass;
      delete this._stableElement;
      delete this._stableElementFromBottom;
      this._mode = TRACK_BOTTOM;
      this._postMutateTop = scrollTop;
    },


    /*
     * Scroll to the bottom and switch the mode to TRACK_BOTTOM
     */
    scrollToBottomContinuously: function(ms) {
      console.log('scrollToBottomContinuously');
      continuous(this.scrollToBottom.bind(this), ms);
    },

    updateTrackNoPass: function() {
      console.log('updateTrackNoPass');
      var target = this._target;
      var targetScrollHeight = target.scrollHeight;
      var targetClientHeight = target.clientHeight;

      // How far down are we?
      var scrollTop = targetScrollHeight - targetClientHeight;

      // Get the offset of the element that we should not pass
      var nopassOffset = this._nopass.offsetTop - target.offsetTop;
      if(scrollTop < nopassOffset) {
        target.scrollTop = scrollTop;
      } else {
        target.scrollTop = nopassOffset;
        this._nopass = null;
        this._mode = STABLE;

        this._stableElement = this.getBottomMostVisibleElement();

        // TODO: check that the element is within the targets DOM heirachy
        var scrollBottom = target.scrollTop + target.clientHeight;
        var stableElementTop = this._stableElement.offsetTop - target.offsetTop;

        // Calculate an record the distance of the stable element to the bottom of the view
        this._stableElementFromBottom = scrollBottom - stableElementTop;
      }
    },


    updateStableTracking: function() {
      console.log('updateStableTracking');
      if(!this._stableElement) return;
      var target = this._target;

      var stableElementTop = this._stableElement.offsetTop - target.offsetTop;
      var top = stableElementTop - target.clientHeight + this._stableElementFromBottom;
      target.scrollTop = top;
    },

    trackLocation: function() {
      var target = this._target;
      if(this._postMutateTop === target.scrollTop) {
        return true;
      }

      var atBottom = target.scrollTop >= target.scrollHeight - target.clientHeight - BOTTOM_MARGIN;

      if(atBottom) {
        if(this._nopass) {
          if(this._mode != TRACK_NO_PASS) {
            this._mode = TRACK_NO_PASS;

          }
        } else {
          if(this._mode != TRACK_BOTTOM) {
            this._mode = TRACK_BOTTOM;
          }
        }
      } else {
        if(this._mode != STABLE) {
          this._mode = STABLE;
        }
      }

      if(this._mode === STABLE) {
        this._stableElement = this.getBottomMostVisibleElement();

        // TODO: check that the element is within the targets DOM heirachy
        var scrollBottom = target.scrollTop + target.clientHeight;
        var stableElementTop = this._stableElement.offsetTop - target.offsetTop;

        // Calculate an record the distance of the stable element to the bottom of the view
        this._stableElementFromBottom = scrollBottom - stableElementTop;
      }

      return true;
    },

    getBottomMostVisibleElement: function() {
      var scrollTop = this._target.scrollTop;
      var clientHeight = this._target.clientHeight;
      var max = scrollTop + clientHeight;
      var target = this._target;
      var children = target.children;

      for(var i = children.length - 1; i >= 0; i--) {
        var child = children[i];
        if(child.offsetTop < max) {
          return child;
        }
      }

      return;
    }
  };

  return Rollers;
});