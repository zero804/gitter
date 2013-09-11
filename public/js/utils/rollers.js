/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(['log!rollers','./legacy-mutations'], function(log, LegacyMutations) {
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

    this._nopass = null;
    this._stableElement = null;
    this._mode = TRACK_BOTTOM;

    var self = this;
    // create an observer instance
    var MutationObserver = window.MutationObserver || window.MozMutationObserver || window.WebKitMutationObserver || LegacyMutations;
    var observer = new MutationObserver(function(/*mutations*/) {
      self._mutationHandlers[self._mode]();
      self._postMutateTop = self._target.scrollTop;
    });

    target.addEventListener('scroll', this.trackLocation.bind(this));

    // pass in the target node, as well as the observer options
    observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  }

  Rollers.prototype = {
    trackUntil: function(element) {
      if(this._mode != STABLE) {
        this._nopass = element;
        this._mode = TRACK_NO_PASS;
      }
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
      var atBottom = target.scrollTop >= target.scrollHeight - target.clientHeight - 15;
      return atBottom;
    },

    updateTrackBottom: function() {
      var target = this._target;
      var scrollTop = target.scrollHeight - target.clientHeight;
      target.scrollTop = scrollTop;
    },

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

    updateTrackNoPass: function() {
      var target = this._target;

      var scrollTop = target.scrollHeight - target.clientHeight;
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
        //this.trackLocation();
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
      if(this._postMutateTop === target.scrollTop) {
        return true;
      }

      var atBottom = target.scrollTop >= target.scrollHeight - target.clientHeight - 15;

      if(atBottom) {
        if(this._nopass) {
          if(this._mode != TRACK_NO_PASS) {
            log('Switching to TRACK_NO_PASS');
            this._mode = TRACK_NO_PASS;

          }
        } else {
          if(this._mode != TRACK_BOTTOM) {
            log('Switching to TRACK_BOTTOM');
            this._mode = TRACK_BOTTOM;
          }
        }
      } else {
        if(this._mode != STABLE) {
          log('Switching to STABLE');
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
      var t = document.querySelector('#content-frame');
      var children = t.children;
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