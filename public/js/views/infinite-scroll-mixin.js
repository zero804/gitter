define([
  'utils/never-ending-story',
  'log!infinite-scroll'
], function(NeverEndingStory, log) {
  "use strict";

  /** @const */
  var PAGE_SIZE = 15;

  /**
   * This mixin is intended for Marionette.CollectionView
   */
  return {
    initialize: function() {
      var scrollElement = this.scrollElementSelector ? /*this.el*/document.querySelector(this.scrollElementSelector) : this.el;

      var scroll = new NeverEndingStory(scrollElement, { reverse: this.reverseScrolling });
      this.listenTo(scroll, 'approaching.end', function() {
        this.loadMore();
      });

      this.listenTo(this.collection, 'search:newquery', function() {
        scroll.enable();
        scroll.scrollToOrigin();
      });

      this.listenTo(this.collection, 'search:nomore', function() {
        scroll.disable();
      });


      this.scroll = scroll;
    },

    beforeClose: function() {
      this.scroll.disable();
    },

    loadMore: function() {
      // If the collection support pagenation, use it
      if(this.collection.fetchNext) {
        this.collection.fetchNext({
          context: this,
          done: function() {
            this.scroll.loadComplete();
          }
        });

        /* Our work here is done */
        return;
      }

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
