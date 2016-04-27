'use strict';

var _                               = require('underscore');
var Marionette                      = require('backbone.marionette');
var cocktail                        = require('cocktail');
var KeyboardEventMixin              = require('views/keyboard-events-mixin');

var isNullOrUndefined = function(obj) {
  return obj === null || obj === undefined;
};

// Transforms 1/-1 or true/false
// into 1 or -1
var sanitizeDir = function(dir) {
  return (dir === false) ? -1 : Math.sign(dir || 1);
};


var FOCUS_EVENT = 'focus:item';
var BLUR_EVENT = 'blur:item';

var MINIBAR_KEY = 'minibar';
var ROOM_LIST_KEY = 'room-list';


var KeyboardControllerView = Marionette.LayoutView.extend({
  constants: {
    FOCUS_EVENT: FOCUS_EVENT,
    BLUR_EVENT: BLUR_EVENT,

    MINIBAR_KEY: MINIBAR_KEY,
    ROOM_LIST_KEY: ROOM_LIST_KEY
  },

  keyboardEvents: {
    'minibar.start-nav': function(e) { this.startNavigation(e, MINIBAR_KEY, true); },
    'minibar-item.prev': function(e) { this.selectPrev(e, MINIBAR_KEY); },
    'minibar-item.next': function(e) { this.selectNext(e, MINIBAR_KEY); },

    'room-list.start-nav': function(e) { this.startNavigation(e, ROOM_LIST_KEY, false); },
    'room-list-item.prev': function(e) { this.selectPrev(e, ROOM_LIST_KEY); },
    'room-list-item.next': function(e) { this.selectNext(e, ROOM_LIST_KEY); },

    'room.1 room.2 room.3 room.4 room.5 room.6 room.7 room.8 room.9 room.10': 'asdfasdfsdf'
  },

  // Public method meant to be used on the outside
  // Add new collections to navigate
  // ```js
  //   keyboardControllerView.inject(keyboardControllerView.constants.ROOM_LIST_KEY, [{
  //     collection: someCollection,
  //     // Optional function to determine(returns boolean) whether to use this collection when navigating along.
  //     getActive: function(){ /*...*/} },
  //   }]);
  // ```
  inject: function(mapKey, newNavigableCollectionItems) {
    this.navigableCollectionListMap[mapKey] = (this.navigableCollectionListMap[mapKey] || []).concat(newNavigableCollectionItems);

    newNavigableCollectionItems.forEach(function(collectionItem) {
      this.listenTo(collectionItem.collection, 'change:active', function(model) {
        // Set a new current reference when we find a new active model
        if(model.get('active')) {
          this.startNavigation(null, mapKey, true);
        }
      });
    }.bind(this));
  },

  initialize: function() {
    this.currentNavigableItemReference = {
      mapKey: null,
      listIndex: null,
      modelId: null,
      // Back-up in case the model doesn't have an id
      modelIndex: null
    };

    window.getCurrentNavigableItemReference = function() {
      return this.currentNavigableItemReference;
    }.bind(this);

    // This object has a structure like the following,
    // { foo: [{ collection, getActive }, { collection, getActive }], bar: [/*...*/]}
    this.navigableCollectionListMap = {};
  },

  getCurrentReferenceModel: function() {
    var currentItemReference = this.currentNavigableItemReference;
    var isValidCurrentReference = !isNullOrUndefined(currentItemReference.mapKey) &&
      !isNullOrUndefined(currentItemReference.listIndex) &&
      (!isNullOrUndefined(currentItemReference.modelId) || !isNullOrUndefined(currentItemReference.modelIndex));

    if(isValidCurrentReference) {
      var currentNavigationCollectionList = this.navigableCollectionListMap[currentItemReference.mapKey];
      var currentNavigationCollectionItem = currentNavigationCollectionList[currentItemReference.listIndex];
      var currentModel = currentItemReference.modelId ?
        currentNavigationCollectionItem.collection.get(currentItemReference.modelId) :
        currentNavigationCollectionItem.collection.at(currentItemReference.modelIndex);

      return currentModel;
    }

    return null;
  },

  // Helper function to blur the current active item we have stored
  blurCurrentItem: function() {
    var currentModel = this.getCurrentReferenceModel();
    if(currentModel) {
      currentModel.trigger(BLUR_EVENT);
    }
  },


    // Helper function to the next progressable `navigableCollectionItem`
    // in the provided, `navigableCollectionList`, list of items
  findNextActiveNavigableCollection: function(navigableCollectionList, startingIndex, dir) {
    dir = sanitizeDir(dir);

    // Recursive function
    var lookAtNextCollection = function lookAtNextCollection(index) {
      var incrementedIndex = index + dir;
      var nextIndex = incrementedIndex;
      if(dir > 0 && incrementedIndex >= navigableCollectionList.length) {
        nextIndex = 0;
      }
      else if(dir < 0 && incrementedIndex < 0) {
        nextIndex = navigableCollectionList.length - 1;
      }

      var potentialNextCollectionItem = navigableCollectionList[nextIndex];

      // Find our resultant
      var getActiveCb = (potentialNextCollectionItem.getActive || function() { return true; });
      if(getActiveCb()) {
        // Strap on an index for referencing our current spot
        return _.extend({}, potentialNextCollectionItem, {
          index: nextIndex
        });
      }
      // Our escape
      // We either only have one navigable collection
      // or we already looped around and didn't find anything
      else if(nextIndex === startingIndex) {
        return null;
      }

      // Do another iteration
      return lookAtNextCollection(nextIndex);
    };

    return navigableCollectionList ? lookAtNextCollection(startingIndex) : null;
  },

  // Helper function to the next model to move to
  findNextModel: function(dir, mapKey) {
    dir = sanitizeDir(dir);

    var navigableCollectionList = this.navigableCollectionListMap[mapKey];

    var collectionItemForActiveModel = !isNullOrUndefined(this.currentNavigableItemReference.listIndex) ?
      // Start at the current reference
      this.findNextActiveNavigableCollection(
        navigableCollectionList,
        // We go one back so the find next method will find the current
        this.currentNavigableItemReference.listIndex - dir,
        dir
      ) :
      // Otherwise just use the first active collection you can find
      this.findNextActiveNavigableCollection(
        navigableCollectionList,
        -1,
        dir
      );

    if(collectionItemForActiveModel) {
      // Use the current reference if available
      // Otherwise default to the first model in the collection
      var activeModel = this.getCurrentReferenceModel() || collectionItemForActiveModel.collection.models[0];
      var activeIndex = this.currentNavigableItemReference.modelIndex || 0;

      if(activeModel) {
        // Find the next active collection
        var nextCollectionItem = this.findNextActiveNavigableCollection(
          navigableCollectionList,
          collectionItemForActiveModel.index,
          dir
        );

        // Figure out what collectionItem we need to look into and whether we need to rollover to the nextCollectionItem
        var collectionItemWithNextModel = collectionItemForActiveModel;
        var nextInDirectionIndex = activeIndex + dir;
        if(dir > 0 && nextInDirectionIndex >= collectionItemForActiveModel.collection.models.length) {
          collectionItemWithNextModel = nextCollectionItem;
          nextInDirectionIndex = 0;
        }
        else if(dir < 0 && nextInDirectionIndex < 0) {
          collectionItemWithNextModel = nextCollectionItem;
          nextInDirectionIndex = collectionItemWithNextModel.collection.models.length - 1;
        }

        // We use `collection.models[x]` vs `collection.at(x)` because the ProxyCollection doesn't update the index
        var nextInDirectionModel = collectionItemWithNextModel.collection.models[nextInDirectionIndex];

        return {
          model: nextInDirectionModel,
          reference: {
            mapKey: mapKey,
            listIndex: collectionItemWithNextModel.index,
            modelId: nextInDirectionModel.id,
            modelIndex: nextInDirectionIndex
          }
        };
      }
    }

    return {};
  },


  // When you start/switch navigating a navigableCollection, we need to find where
  // you should start off and set the current reference
  startNavigation: function(e, mapKey, shouldGoToActive) {
    // Clear out any previous focus as we have moved to a new area
    this.blurCurrentItem();

    var startCollectionItem;
    var startModel;
    var startModelIndex;
    if(shouldGoToActive) {
      // Find the first active item
      // This will ensure we start from where the user is currently is
      this.navigableCollectionListMap[mapKey].some(function(collectionItem, index) {
        var activeModel;
        var activeModelIndex;
        // We use `collection.models.some` vs `collection.findWhere({ active: true })` because we
        // also want to get the index as a back-up model id
        collectionItem.collection.models.some(function(model, modelIndex) {
          if(model.get('active')) {
            activeModel = model;
            activeModelIndex = modelIndex;
            // break;
            return true;
          }
        });

        if(activeModel) {
          // Strap on an index for referencing our current spot
          startCollectionItem = _.extend({}, collectionItem, {
            index: index
          });
          startModel = activeModel;
          startModelIndex = activeModelIndex;
          // break
          return true;
        }
      });
    }
    else {
      // Find the first item in the first active collection
      // Items from `findNextActiveNavigableCollection` already have `index`
      startCollectionItem = this.findNextActiveNavigableCollection(this.navigableCollectionListMap[mapKey], -1, 1);
      startModel = startCollectionItem.collection.at(0);
      startModelIndex = 0;
    }


    if(startModel) {
      // Save it as the current
      this.currentNavigableItemReference = {
        mapKey: mapKey,
        listIndex: startCollectionItem.index,
        modelId: startModel.id,
        modelIndex: startModelIndex
      };
      startModel.trigger(FOCUS_EVENT);
    }
  },


  // Move to the next progressable item forwards/backwards depending on `dir`
  progressInDirection: function(dir, mapKey) {
    dir = sanitizeDir(dir);
    var nextModelResult = this.findNextModel(dir, mapKey);


    if(nextModelResult && nextModelResult.model) {
      // Deactivate the current item
      this.blurCurrentItem();

      // Activate the next item
      this.currentNavigableItemReference = nextModelResult.reference;
      nextModelResult.model.trigger(FOCUS_EVENT);
    }
  },

  // Helper function to determine whether it is ok to use the `Tab` event to navigate the items.
  // We want to be able to escape out of this list of items once we `Tab` at the end of the list or
  // we were at the start of the list using `Shift + Tab`
  shouldCaptureTabEvent: function(e) {
    // If the tab key was pushed
    if(e.code.toLowerCase() === 'tab') {
      var navigableCollectionList = this.navigableCollectionListMap[this.currentNavigableItemReference.mapKey];
      var collectionItemForCurrentModel = navigableCollectionList[this.currentNavigableItemReference.listIndex];

      // If we are on the first or last item already, let's just let them pass on
      if(this.currentNavigableItemReference.listIndex === (navigableCollectionList.length - 1)) {
        var currentModels = collectionItemForCurrentModel.collection.models;
        // We use `collection.models.length` vs `collection.length` because the ProxyCollection doesn't update the length
        var firstModel = currentModels[0];
        var lastModel = currentModels[currentModels.length - 1];

        if(e.shiftKey && this.currentNavigableItemReference.modelId === firstModel.id) {
          return false;
        }
        else if(!e.shiftKey && this.currentNavigableItemReference.modelId === lastModel.id) {
          return false;
        }
      }
    }

    return true;
  },

  // Helper to smooth out problems
  // Kick the current reference into shape
  // And make sure we should handle the event itself(currently only have to worry about `tab`)
  shouldHandleEvent: function(e, mapKey) {
    if(
      // If the current location reference is different than what we were just told to navigate to.
      mapKey !== this.currentNavigableItemReference.mapKey ||
      // Or our current reference is not filled in.
      !this.getCurrentReferenceModel()
    ) {
      // Restart the navigation from the currently active item
      this.startNavigation(null, mapKey, true);
    }

    return this.shouldCaptureTabEvent(e);
  },

  // Move to the previous item in the current navigableCollection
  selectPrev: function(e, mapKey) {
    if(this.shouldHandleEvent(e, mapKey)) {
      this.progressInDirection(-1, mapKey);
      e.preventDefault();
      e.stopPropagation();
    }
  },

  // Move to the next item in the current navigableCollection
  selectNext: function(e, mapKey) {
    if(this.shouldHandleEvent(e, mapKey)) {
      this.progressInDirection(1, mapKey);
      e.preventDefault();
      e.stopPropagation();
    }
  }


});

cocktail.mixin(KeyboardControllerView, KeyboardEventMixin);


module.exports = KeyboardControllerView;
