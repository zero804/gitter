"use strict";
var _ = require('underscore');
var utils = require('../utils/utils');
var context = require('../utils/context');

module.exports = (function() {


  return {
    initialize: function() {
      this.atTop = false;
      this.atBottom = true;
    },

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

    fetchLatest: function(options, callback, context) {
      var self = this;
      if(this.atBottom) return;
      if(this._isFetching) return;

      var loadLimit = this.getLoadLimit();

      var data = this.getQuery && this.getQuery() || {};
      data = _.defaults(data, { limit: loadLimit /* Latest is the default */ });

      var existingIds = utils.index(this.pluck('id'), utils.identityTransform);

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response/*, options*/) { // jshint unused:true
          delete self._isFetching;
          self.setAtBottom(true);

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
            self.setAtTop(true);
          } else {
            self.trimTop();
          }

          self.trigger('scroll.fetch', 'previous');

          if(callback) callback.call(context);
        },
        error: function (err) {
          if (callback) callback.call(context || null, err);
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

      var data = this.getQuery && this.getQuery() || {};
      data = _.defaults(data, { beforeId: beforeId, limit: loadLimit });

      // var data = { beforeId: beforeId, limit: loadLimit };
      var self = this;

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response) {
          delete self._isFetching;
          if(response.length < loadLimit) {
            // NO MORE
            self.setAtTop(true);
          }
          self.trimBottom();

          self.trigger('scroll.fetch', 'previous');

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
      var data = this.getQuery && this.getQuery() || {};
      data = _.defaults(data, { afterId: afterId, limit: loadLimit });
      // var data = { afterId: afterId, limit: loadLimit };

      this.trigger('fetch.started');

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response) {
          self.trigger('fetch.completed');

          delete self._isFetching;
          if(response.length < loadLimit) {
            // NO MORE
            self.setAtBottom(true);
          }
          self.trimTop();
          self.trigger('scroll.fetch', 'next');

          if(callback) callback.call(context);
        },
        error: function(err) {
          self.trigger('fetch.completed');
          if(callback) callback.call(err);
        }
      });
    },

    fetchAtPoint: function(query, options, callback, context) {
      // if(this.atTop) return; // Already at the top
      if(this._isFetching) return;
      this._isFetching = true;

      var loadLimit = this.getLoadLimit();

      var existingIds = utils.index(this.pluck('id'), utils.identityTransform);

      var data = this.getQuery && this.getQuery() || {};
      data = _.defaults(data, query, { limit: loadLimit });
      var self = this;

      this.fetch({
        remove: ('remove' in options) ? options.remove : false,
        add: ('add' in options) ? options.add : true,
        merge: ('merge' in options) ? options.merge : true,
        data: data,
        success: function(collection, response) {
          delete self._isFetching;

          var responseIds = response.map(utils.idTransform);
          var responseOverlaps = responseIds.some(function(id) {
            return existingIds[id];
          });

          if(!responseOverlaps) {
            self.setAtBottom(false);
            self.setAtTop(false);
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

          if(callback) callback.call(context);
        },
        error: function(err) {
          if(callback) callback.call(err);
        }
      });
    },

    fetchFromMarker: function(marker, options, callback, context) {
      return this.fetchAtPoint({ marker: marker }, options, callback, context);
    },

    trimTop: function() {
      var collectionLimit = this.getCollectionLimit();

      if(this.length > collectionLimit) {
        var forRemoval = this.slice(0, -collectionLimit);
        this.remove(forRemoval);
        this.setAtTop(false);
      }
    },

    trimBottom: function() {
      var collectionLimit = this.getCollectionLimit();

      if(this.length > collectionLimit) {
        var forRemoval = this.slice(collectionLimit);
        this.remove(forRemoval);
        this.setAtBottom(false);
      }
    },

    getSnapshotState: function() {
      // If snapshot state has been passed from the server use it once
      var initialSnapshot = context().snapshots;
      if(initialSnapshot) {
        var config = initialSnapshot[this.modelName];
        if(config) {
          // Come up with a better algorithm for this
          this.setAtTop(false);
          this.setAtBottom(!config.aroundId);

          this.listenToOnce(this, 'snapshot', function() {
            delete initialSnapshot[this.modelName];
          });
        }

        return config;
      }

      // TODO: handle initial load
      if(!this.length) return;

      if(this.atBottom) {
        // At the bottom is easy-ish
        return { limit: this.length };
      }

      var end = this.at(this.length - 1).get('id');

      return { limit: this.length, beforeInclId: end };
    },

    setAtTop: function(value) {
      if(!!value === !!this.atTop) return; // jshint ignore:line
      this.atTop = !!value;
      this.trigger('atTopChanged', this.atTop);
    },

    setAtBottom: function(value) {
      if(!!value === !!this.atBottom) return; // jshint ignore:line
      this.atBottom = !!value;
      this.trigger('atBottomChanged', this.atBottom);
    }
  };

})();

