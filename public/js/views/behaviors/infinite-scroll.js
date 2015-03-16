"use strict";
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');
var NeverEndingStory = require('utils/never-ending-story');

module.exports = (function() {


  var Behavior = Marionette.Behavior.extend({
    defaults: {
      reverseScrolling: false,
      scrollElementSelector: null,
      contentWrapper: null
    },
    initialize: function() {
      var scrollElementSelector = this.options.scrollElementSelector;
      var reverseScrolling = this.options.reverseScrolling;

      var scrollElement = scrollElementSelector ? document.querySelector(scrollElementSelector) : this.view.el;
      var contentWrapperEl;
      if(this.options.contentWrapper) {
        contentWrapperEl = scrollElement.querySelector(this.options.contentWrapper);
      }

      var scroll = new NeverEndingStory(scrollElement, {
        reverse: reverseScrolling,
        contentWrapper: contentWrapperEl
      });

      this.listenTo(scroll, 'approaching.top', function() {
        this.view.collection.fetchMoreBefore({});
      });

      this.listenTo(scroll, 'approaching.bottom', function() {
        this.view.collection.fetchMoreAfter({});
      });

      this.listenTo(scroll, 'near.top.changed', function(nearTop) {
        this.nearTop = nearTop;
        this.view.trigger('near.top.changed', nearTop);
      });

      this.scroll = scroll;
    },

    onDestroy: function() {
      this.scroll.disable();
    }
  });


  behaviourLookup.register('InfiniteScroll', Behavior);
  return Behavior;

})();

