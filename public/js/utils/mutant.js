/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'backbone',
  './legacy-mutations'
], function(_, Backbone, LegacyMutations) {
  "use strict";

  function EventHandler(element, callback, context) {
    this.element = element;
    this.callback = callback;
    this.context = context;
    element.addEventListener('load', this, false);
    element.addEventListener('error', this, false);
  }

  EventHandler.prototype = {
    detach: function() {
      if(!this.element) return;

      this.element.removeEventListener('load', this, false);
      this.element.removeEventListener('error', this, false);
      this.element = null;
      this.callback = null;
      this.context = null;
    },

    handleEvent: function(e) {
      this.callback.call(this.context, e, this);
    },
  };

  var MutationObserver = window.MutationObserver || window.MozMutationObserver || window.WebKitMutationObserver || LegacyMutations;
  var idCounter = 0;

  function isWatchCandidate(node) {
    var r = node.nodeType === 1 &&
            node.tagName === 'IMG' &&
            !node.complete &&
            (!node.getAttribute('width') || !node.getAttribute('height'));

    return r;
  }

  function Mutant(target) {
    var s = this;

    this.eventHandlers = {};

    this.findLoadingImages(target);

    this.mutationCallback = this.mutationCallback.bind(this);
    this.observer = new MutationObserver(this.mutationCallback);

    this.mutationThrottled = _.throttle(function() {
      s.trigger('mutation.throttled');
    }, 20);

    // pass in the target node, as well as the observer options
    this.observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  }

  _.extend(Mutant.prototype, Backbone.Events, {
    addListener: function(element) {
      if(element.dataset.gLoadListenerId) return;

      var id = ++idCounter;
      element.dataset.gLoadListenerId = id;

      this.eventHandlers[id] = new EventHandler(element, function(event, eventHandler) {
        eventHandler.detach();

        this.trigger('mutation');
        this.mutationThrottled();
      }, this);

    },

    removeListener: function(element) {
      var id = element.dataset.gLoadListenerId;
      if(!id) return;
      delete element.dataset.gLoadListenerId;

      var handler = this.eventHandlers[id];
      if(!handler) return;
      delete this.eventHandlers[id];

      handler.detach();
    },

    mutationCallback: function(mutationRecords) {
      var s = this;

      mutationRecords.forEach(function(r) {
        var node;

        if(r.type === 'childList') {
          // Iterate nodeLists which don't have a .forEach
          if(r.addedNodes) {
            for(var i = 0; i < r.addedNodes.length; i++) {
              node = r.addedNodes[i];
              if(node.nodeType === 1) {
                if(node.children.length) {
                  s.findLoadingImages(node);
                } else {
                  if(isWatchCandidate(node)) {
                    s.addListener(node);
                  }
                }
              }

            }
          }

          if(r.removedNodes) {
            for(var j = 0; j < r.removedNodes.length; j++) {
              node = r.removedNodes[j];
              if(node.nodeType === 1) {
                if(node.children.length) {
                } else {
                  if(node.tagName === 'IMG') {
                    s.removeListener(node);
                  }
                }

              }

            }
          }
        }
      });

      s.trigger('mutation');
      s.mutationThrottled();
    },


    findLoadingImages: function(element) {
      var treeWalker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: function(node) {
            if(isWatchCandidate(node)) {
              return NodeFilter.FILTER_ACCEPT;
            }

            return NodeFilter.FILTER_SKIP;
          }
        },
        false
      );

      while(treeWalker.nextNode()) {
        this.addListener(treeWalker.currentNode);
      }
    },

    takeRecords: function() {
      return this.observer.takeRecords();
    },

    disconnect: function() {
      this.observer.disconnect();
      var eh = this.eventHandlers;

      Object.keys(eh).forEach(function(id) {
        var handler = eh[id];
        if(!handler) return;
        delete eh[id];

        handler.detach();
      });
    }
  });

  return Mutant;
});