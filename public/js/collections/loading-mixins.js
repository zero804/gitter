"use strict";

module.exports = {
  LoadingMixin: {
    initialize: function() {
      if(this.length === 0) {
        this.loading = true;
        this.listenToOnce(this, 'add reset sync', this.loadComplete);
      }
    },
    loadComplete: function() {
      delete this.loading;
      this.trigger('loaded');
    }
  },

  UnderlyingLoadingMixin: {
    initialize: function() {
      if(this.collection.loading) {
        this.loading = true;
        this.listenToOnce(this.collection, 'loaded', this.loadComplete);
      }
    },
    loadComplete: function() {
      delete this.loading;
      this.trigger('loaded');
    }
  }

};
