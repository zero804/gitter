/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'backbone',
  './legacy-mutations'
], function(_, Backbone, LegacyMutations) {
  "use strict";

  var MutationObserver = window.MutationObserver || window.MozMutationObserver || window.WebKitMutationObserver || LegacyMutations;

  function Mutant(target) {
    var s = this;

    this.mutationCallback = this.mutationCallback.bind(this);
    this.observer = new MutationObserver(this.mutationCallback);

    this.mutationThrottled = _.throttle(function() {
      s.trigger('mutation.throttled');
    }, 20);

    // pass in the target node, as well as the observer options
    this.observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  }

  _.extend(Mutant.prototype, Backbone.Events, {
    mutationCallback: function( /* mutationRecords */ ) {
      // mutationRecords.forEach(function(r) {
      //   if(r.type === 'childList') {
      //     // Iterate nodeLists which don't have a .forEach
      //     if(r.addedNodes) {
      //       for(var i = 0; i < r.addedNodes.length; i++) {
      //       }
      //     }

      //     if(r.removedNodes) {
      //       for(var j = 0; j < r.removedNodes.length; j++) {
      //       }
      //     }
      //   }
      // });
      this.trigger('mutation');
      this.mutationThrottled();
    },

    takeRecords: function() {
      return this.observer.takeRecords();
    },

    disconnect: function() {
      this.observer.disconnect();
    }
  });

  return Mutant;
});