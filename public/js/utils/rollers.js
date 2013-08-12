/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([], function() {
  "use strict";

  /** @const */ var TRACK_BOTTOM = 1;
  /** @const */ var TRACK_NO_PASS = 2;
  /** @const */ var STABLE = 3;

  /* Put your scrolling panels on rollers */
  function Rollers(target) {
    this._target = target;
    this._mutationHandlers = {};
    this._mutationHandlers[TRACK_BOTTOM] = this.updateTrackBottom.bind(this);
    this._mutationHandlers[TRACK_NO_PASS] = this.updateTrackNoPass.bind(this);
    this._mutationHandlers[STABLE] = this.updateStableTracking.bind(this);

    this.trackLocation();
    this._nopass = null;
    this._stableElement = null;
    this._mode = TRACK_BOTTOM;

    var self = this;
    // create an observer instance
    var MutationObserver = window.MutationObserver || window.MozMutationObserver || window.WebKitMutationObserver;
    var observer = new MutationObserver(function(/*mutations*/) {
      self._mutationHandlers[self._mode]();
    });

    target.addEventListener('scroll', this.trackLocation.bind(this));

    // pass in the target node, as well as the observer options
    observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  }

  Rollers.prototype = {
    updateTrackBottom: function() {
      var target = this._target;
      var scrollTop = target.scrollHeight - target.clientHeight - this.scrollBottom;
      target.scrollTop = scrollTop;
    },

    updateTrackNoPass: function() {
      var target = this._target;

      var scrollTop = target.scrollHeight - target.clientHeight - this.scrollBottom;
      var nopassOffset = this._nopass.offsetTop - target.offsetTop;
      if(scrollTop < nopassOffset) {
        target.scrollTop = scrollTop;
      } else {
        target.scrollTop = nopassOffset;
        this._nopass = null;
        this._mode = STABLE;
        this.trackLocation();
      }
    },

    updateStableTracking: function() {
      if(!this._stableElement) return;
      var target = this._target;

      var stableElementTop = this._stableElement.offsetTop - target.offsetTop;
      var top = stableElementTop - target.clientHeight + this._stableElementFromBottom;
      target.scrollTop = top;
    },

    trackLocation: function() {
      var target = this._target;

      var atBottom = target.scrollTop >= target.scrollHeight - target.clientHeight - 5;
      if(atBottom) {
        if(this._nopass) {
          this._mode = TRACK_NO_PASS;
        } else {
          this._mode = TRACK_BOTTOM;
        }
      } else {
        this._mode = STABLE;
      }

      this.scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if(this._mode === STABLE) {
        this._stableElement = this.getBottomMostVisibleElement();

        // TODO: check that the element is within the targets DOM heirachy
        var scrollBottom = target.scrollTop + target.clientHeight;
        var stableElementTop = this._stableElement.offsetTop - target.offsetTop;

        // Calculate an record the distance of the stable element to the bottom of the view
        this._stableElementFromBottom = scrollBottom - stableElementTop;
      }

    },

    getBottomMostVisibleElement: function() {
      var rect = this._target.getBoundingClientRect();
      var x = rect.left + 5;
      var y = rect.bottom - 5;
      return document.elementFromPoint(x,y);
    }
  };

  return Rollers;
});