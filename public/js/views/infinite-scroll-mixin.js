/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/never-ending-story'
], function(NeverEndingStory) {
  "use strict";

  /** @const */
  var PAGE_SIZE = 15;

  /**
   * This mixin is intended for Marionette.CollectionView
   */
  return {
    initialize: function() {
      var scrollElement = document.querySelector(this.scrollElementSelector);
      this.$el.find().on('scroll', this.onScroll);

      var scroll = new NeverEndingStory(scrollElement);
      this.listenTo(scroll, 'approaching.end', function() {
        this.loadMore();
      });

      this.scroll = scroll;
    },

    beforeClose: function() {
      this.scroll.disable();
    },

    loadMore: function() {
      var fetchData = this.getFetchData && this.getFetchData.call(this) || {
        skip: this.collection.length,
        limit: PAGE_SIZE
      };


      if(!fetchData) {
        // No fetch data means nothing to fetch
        return;
      }

      var itemAdded = false;
      function onAdd() {
        itemAdded = true;
      }

      this.collection.once('add', onAdd);

      var self = this;
      this.collection.fetch({
        update: true,
        add: true,
        remove: false, // Never remove on load more
        data: fetchData,
        success: function() {
          self.scroll.loadComplete();

          self.collection.off('add', onAdd);

          if(!itemAdded) {
            // turn off infinite scroll if there were no new messages retrieved
            self.scroll.disable();
          }

        },
        error: function() {
          self.scroll.loadComplete();
        }
      });
    }


  };

});
