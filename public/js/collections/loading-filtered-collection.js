"use strict";

/* Fires loading/loaded triggers on Filtered Collections */
module.exports = function(filteredCollection) {
  var underlyingCollection = filteredCollection.collection;

  filteredCollection.loading = underlyingCollection.loading;
  filteredCollection.listenTo(underlyingCollection, 'loading', function() {
    this.loading = underlyingCollection.loading;
    this.trigger('loading');
  });

  filteredCollection.listenTo(underlyingCollection, 'loaded', function() {
    this.loading = this.collection.loading;
    this.trigger('loaded');
  });

};
