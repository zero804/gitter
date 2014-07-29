define([
  '../utils/utils'
], function(utils) {
  "use strict";

  return {
    getLoadLimit: function() {
      return Math.round((window.screen.height-150)/20);
    },

    getCollectionLimit: function() {
      return 5 * this.getLoadLimit();
    },

    ignoreDataChange: function(data) {
      if(data.operation === 'create') return !this.atBottom;

      return false;
    },

    checkLimit: function(xhr) {
      var limitReached = xhr.getResponseHeader('LimitReached') === 'true';
      if (limitReached) {
        this.trigger('limitReached');
      }
    },

    fetchLatest: function(options, callback, context) {
      var self = this;
      if(this.atBottom) return;
      if(this._isFetching) return;

      var loadLimit = this.getLoadLimit();

      var data = { limit: loadLimit /* Latest is the default */ };

      var existingIds = utils.index(this.pluck('id'), utils.identityTransform);

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response, options) {
          delete self._isFetching;
          self.atBottom = true;

          var responseIds = response.map(utils.idTransform);
          var responseOverlaps = responseIds.some(function(id) {
            return existingIds[id];
          });

          if(!responseOverlaps) {
            // No overlap, we're going to need to delete the existing items
            var existingModels = Object.keys(existingIds)
                                  .map(function(id) {
                                    return self.get(id);
                                  });
            self.remove(existingModels);
          }

          // Less than the requested limit? Must be at the top
          if(response.length < loadLimit) {
            // NO MORE
            self.atTop = true;
          } else {
            self.trimTop();
          }

          self.trigger('scroll.fetch', 'previous');
          self.checkLimit(options.xhr);

          if(callback) callback.call(context);
        },
        error: function(err) {
          if(callback) callback.call(err);
        }
      });

    },

    fetchMoreBefore: function(options, callback, context) {
      if(this.atTop) return;
      if(this._isFetching) return;
      this._isFetching = true;

      var beforeId;
      if(this.length) {
        beforeId = utils.min(this.pluck('id'));
      }

      var loadLimit = this.getLoadLimit();

      var data = { beforeId: beforeId, limit: loadLimit };
      var self = this;

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response, options) {
          delete self._isFetching;
          if(response.length < loadLimit) {
            // NO MORE
            self.atTop = true;
          }
          self.trimBottom();

          self.trigger('scroll.fetch', 'previous');
          self.checkLimit(options.xhr);

          if(callback) callback.call(context);
        },
        error: function(err) {
          if(callback) callback.call(err);
        }
      });
    },

    fetchMoreAfter: function(options, callback, context) {
      var self = this;
      if(this.atBottom) return;
      if(this._isFetching) return;
      this._isFetching = true;
      var afterId;
      if(this.length) {
        afterId = utils.max(this.pluck('id'));
      }

      var loadLimit = this.getLoadLimit();

      var data = { afterId: afterId, limit: loadLimit };

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response, options) {
          delete self._isFetching;
          if(response.length < loadLimit) {
            // NO MORE
            self.atBottom = true;
          }
          self.trimTop();
          self.trigger('scroll.fetch', 'next');
          self.checkLimit(options.xhr);

          if(callback) callback.call(context);
        },
        error: function(err) {
          if(callback) callback.call(err);
        }
      });
    },

    fetchFromMarker: function(marker, options, callback, context) {
      if(this.atTop) return; // Already at the top
      if(this._isFetching) return;
      this._isFetching = true;

      var loadLimit = this.getLoadLimit();

      var existingIds = utils.index(this.pluck('id'), utils.identityTransform);

      var data = { marker: marker, limit: loadLimit };
      var self = this;

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response, options) {
          delete self._isFetching;

          var responseIds = response.map(utils.idTransform);
          var responseOverlaps = responseIds.some(function(id) {
            return existingIds[id];
          });

          if(!responseOverlaps) {
            self.atBottom = false;
            self.atTop = false;
            // No overlap, we're going to need to delete the existing items
            var existingModels = Object.keys(existingIds)
                                  .map(function(id) {
                                    return self.get(id);
                                  });
            self.remove(existingModels);
          }

          // Ideally we should trim both sides
          self.trimBottom();

          self.trigger('scroll.fetch', 'marker');
          self.checkLimit(options.xhr);

          if(callback) callback.call(context);
        },
        error: function(err) {
          if(callback) callback.call(err);
        }
      });
    },

    trimTop: function() {
      var collectionLimit = this.getCollectionLimit();

      if(this.length > collectionLimit) {
        var forRemoval = this.slice(0, -collectionLimit);
        this.remove(forRemoval);
        this.atTop = false;
      }
    },

    trimBottom: function() {
      var collectionLimit = this.getCollectionLimit();

      if(this.length > collectionLimit) {
        var forRemoval = this.slice(collectionLimit);
        this.remove(forRemoval);
        this.atBottom = false;
      }
    },

    getSnapshotState: function() {
      // TODO: handle initial load
      if(!this.length) return;

      if(this.atBottom) {
        // At the bottom is easy-ish
        return { limit: this.length };
      }

      var end = this.at(this.length - 1).get('id');

      return { limit: this.length, beforeInclId: end };
    }
  };
});
