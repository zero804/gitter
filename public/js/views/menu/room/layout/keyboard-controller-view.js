'use strict';

var _                               = require('underscore');
var Marionette                      = require('backbone.marionette');
var cocktail                        = require('cocktail');
var KeyboardEventMixin              = require('views/keyboard-events-mixin');

var isNullOrUndefined = function(obj) {
  return obj === null || obj === undefined;
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
    this.navigableCollectionItemsMap[mapKey] = (this.navigableCollectionItemsMap[mapKey] || []).concat(newNavigableCollectionItems);

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
      navigableItemIndex: null,
      modelId: null
    };
    // This object has a structure like the following,
    // { foo: [{ collection, getActive }, { collection, getActive }], bar: [/*...*/]}
    this.navigableCollectionItemsMap = {};
  },


  // Helper function to the next progressable `navigableCollectionItem`
  // in the provided, `navigableCollectionItems`, list of items
  findNextActiveNavigableCollection: function(navigableCollectionItems, startingIndex, dir) {
    // We accept 1/-1 or true/false
    dir = (dir === false) ? -1 : Math.sign(dir || 1);

    // Recursive function
    var lookAtNextCollection = function lookAtNextCollection(index) {
      var incrementedIndex = index + dir;
      var nextIndex = incrementedIndex;
      if(dir > 0 && incrementedIndex >= navigableCollectionItems.length) {
        nextIndex = 0;
      }
      else if(dir < 0 && incrementedIndex < 0) {
        nextIndex = navigableCollectionItems.length - 1;
      }

      var potentialNextCollectionItem = navigableCollectionItems[nextIndex];

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

    return navigableCollectionItems ? lookAtNextCollection(startingIndex) : null;
  },

  // Helper function to blur the current active item we have stored
  blurCurrentItem: function() {
    var currentItemReference = this.currentNavigableItemReference;
    if(!isNullOrUndefined(currentItemReference.mapKey) && !isNullOrUndefined(currentItemReference.navigableItemIndex) && !isNullOrUndefined(currentItemReference.modelId)) {
      var currentModel = this.navigableCollectionItemsMap[currentItemReference.mapKey][currentItemReference.navigableItemIndex].collection.get(currentItemReference.modelId);
      if(currentModel) {
        currentModel.trigger(BLUR_EVENT);
      }
    }
  },

  // When you start/switch navigating a navigableCollection, we need to find where
  // you should start off and set the current reference
  startNavigation: function(e, mapKey, shouldGoToActive) {
    // Clear out any previous focus as we have moved to a new area
    this.blurCurrentItem();

    var startNavigableCollectionItem;
    var startModel;
    if(shouldGoToActive) {
      // Find the first active item
      // This will ensure we start from where the user is currently is
      this.navigableCollectionItemsMap[mapKey].some(function(collectionItem, index) {
        var activeModel = collectionItem.collection.findWhere({ active: true });
        if(activeModel) {
          // Strap on an index for referencing our current spot
          startNavigableCollectionItem = _.extend({}, collectionItem, {
            index: index
          });
          startModel = activeModel;
          // break
          return true;
        }
      });
    }
    else {
      // Find the first item in the first active collection
      // Items from `findNextActiveNavigableCollection` already have `index`
      startNavigableCollectionItem = this.findNextActiveNavigableCollection(this.navigableCollectionItemsMap[mapKey], -1, 1);
      startModel = startNavigableCollectionItem.collection.at(0);
    }


    if(startModel) {
      // Save it as the current
      this.currentNavigableItemReference = {
        mapKey: mapKey,
        navigableItemIndex: startNavigableCollectionItem.index,
        modelId: startModel.id
      };
      startModel.trigger(FOCUS_EVENT);
    }
  },


  // Move to the next progressable item forwards/backwards depending on `dir`
  progressInDirection: function(dir, mapKey) {
    // We accept 1/-1 or true/false
    dir = (dir === false) ? -1 : Math.sign(dir);
    var navigableCollectionItems = this.navigableCollectionItemsMap[mapKey];

    // If we the current location reference is different than what we were just told
    // to navigate. Restart the navigation from the currently active item
    if(mapKey !== this.currentNavigableItemReference.mapKey) {
      this.startNavigation(null, mapKey, true);
    }

    var collectionItemForActiveModel = !isNullOrUndefined(this.currentNavigableItemReference.navigableItemIndex) ?
      // Get a collection item for a bookmark (just need to move the index back according to dir and use the nice findNext method)
      this.findNextActiveNavigableCollection(
        navigableCollectionItems,
        this.currentNavigableItemReference.navigableItemIndex - dir,
        dir
      ) :
      // Otherwise find the first active collection
      this.findNextActiveNavigableCollection(
        navigableCollectionItems,
        -1,
        dir
      );

    if(collectionItemForActiveModel) {
      var activeModel = (!isNullOrUndefined(this.currentNavigableItemReference.navigableItemIndex) && this.currentNavigableItemReference.modelId) ?
        // If we had a current refernce, find it in the collection
        collectionItemForActiveModel.collection.get(this.currentNavigableItemReference.modelId) :
        // Otherwise default to the first model in the collection
        collectionItemForActiveModel.collection.models[0];


      if(activeModel) {
        // Find the index of the `activeModel` in our collection
        var activeIndex = 0;
        // We use `collection.models...` vs `collection.indexOf(model)` because the ProxyCollection doesn't update the index
        collectionItemForActiveModel.collection.models.some(function(model, index) {
          if(model.id === activeModel.id) {
            activeIndex = index;
            // break
            return true;
          }
        });

        // Find the next active collection
        var nextCollectionItem = this.findNextActiveNavigableCollection(
          navigableCollectionItems,
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


        // Deactivate the current item
        this.blurCurrentItem();

        // Activate the next item
        if(nextInDirectionModel) {
          this.currentNavigableItemReference = {
            mapKey: mapKey,
            navigableItemIndex: collectionItemWithNextModel.index,
            modelId: nextInDirectionModel.id
          };
          nextInDirectionModel.trigger(FOCUS_EVENT);
        }
      }
    }
  },

  // Helper function to determine whether it is ok to use the `Tab` event to navigate the items.
  // We want to be able to escape out of this list of items once we `Tab` at the end of the list or
  // we were at the start of the list using `Shift + Tab`
  shouldCaptureTabEvent: function(e) {
    // If the tab key was pushed
    if(e.code.toLowerCase() === 'tab') {
      var navigableCollectionItems = this.navigableCollectionItemsMap[this.currentNavigableItemReference.mapKey];
      var collectionItemForCurrentModel = navigableCollectionItems[this.currentNavigableItemReference.navigableItemIndex];

      // If we are on the first or last item already, let's just let them pass on
      if(this.currentNavigableItemReference.navigableItemIndex === (navigableCollectionItems.length - 1)) {
        // We use `collection.models.length` vs `collection.length` because the ProxyCollection doesn't update the length
        var firstModel = collectionItemForCurrentModel.collection.models[0];
        var lastModel = collectionItemForCurrentModel.collection.models[collectionItemForCurrentModel.collection.models.length - 1];

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

  // Move to the previous item in the current navigableCollection
  selectPrev: function(e, mapKey) {
    if(this.shouldCaptureTabEvent(e)) {
      this.progressInDirection(-1, mapKey);
      e.preventDefault();
      e.stopPropagation();
    }
  },

  // Move to the next item in the current navigableCollection
  selectNext: function(e, mapKey) {
    if(this.shouldCaptureTabEvent(e)) {
      this.progressInDirection(1, mapKey);
      e.preventDefault();
      e.stopPropagation();
    }
  }


});

cocktail.mixin(KeyboardControllerView, KeyboardEventMixin);


module.exports = KeyboardControllerView;
