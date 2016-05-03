'use strict';

var _                               = require('underscore');
var Marionette                      = require('backbone.marionette');
var cocktail                        = require('cocktail');
var KeyboardEventMixin              = require('views/keyboard-events-mixin');

var sanitizeDir = require('./sanitize-direction');
var findNextActiveItem = require('./find-next-active-item');
var findNextNavigableModel = require('./find-next-navigable-model');

var navigableCollectionItemActiveCb = findNextNavigableModel.navigableCollectionItemActiveCb;

var isNullOrUndefined = function(obj) {
  return obj === null || obj === undefined;
};

var isValidCurrentReference = function(currentItemReference) {
  var isValidCurrentReference = !isNullOrUndefined(currentItemReference.mapKey) &&
    !isNullOrUndefined(currentItemReference.listIndex) &&
    (!isNullOrUndefined(currentItemReference.modelId) || !isNullOrUndefined(currentItemReference.modelIndex));

  return isValidCurrentReference;
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

    'room.1 room.2 room.3 room.4 room.5 room.6 room.7 room.8 room.9 room.10': function(e, handler) { this.selectByIndex(e, ROOM_LIST_KEY, handler); },
    'minibar.1 minibar.2 minibar.3 minibar.4 minibar.5 minibar.6 minibar.7 minibar.8 minibar.9 minibar.10': function(e, handler) { this.selectByIndex(e, MINIBAR_KEY, handler); },
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
    var navigableCollectionList = (this.navigableCollectionListMap[mapKey] || []);
    var beforeNavigableCollectionListLength = navigableCollectionList.length;
    this.navigableCollectionListMap[mapKey] = navigableCollectionList.concat(newNavigableCollectionItems);

    newNavigableCollectionItems.forEach(function(collectionItem, index) {
      // Strap on an index that we can fallback to when
      // there is not a modelId and we need to reference our current spot
      collectionItem.index = beforeNavigableCollectionListLength + index;

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
      modelIndex: null
    };

    // This object has a structure like the following,
    // { foo: [{ collection, getActive }, { collection, getActive }], bar: [/*...*/]}
    this.navigableCollectionListMap = {};
  },


  getCurrentReferenceCollectionList: function() {
    var currentItemReference = this.currentNavigableItemReference;
    if(isValidCurrentReference(currentItemReference)) {
      var currentNavigationCollectionList = this.navigableCollectionListMap[currentItemReference.mapKey];

      return currentNavigationCollectionList;
    }

    return null;
  },

  getCurrentReferenceCollectionItem: function() {
    var currentItemReference = this.currentNavigableItemReference;
    if(isValidCurrentReference(currentItemReference)) {
      var currentNavigationCollectionList = this.getCurrentReferenceCollectionList();
      var currentNavigationCollectionItem = currentNavigationCollectionList[currentItemReference.listIndex];

      return currentNavigationCollectionItem;
    }

    return null;
  },

  getCurrentReferenceModel: function() {
    var currentItemReference = this.currentNavigableItemReference;

    if(isValidCurrentReference(currentItemReference)) {
      var currentNavigationCollectionItem = this.getCurrentReferenceCollectionItem();
      var currentModel = currentItemReference.modelId ?
        currentNavigationCollectionItem.collection.get(currentItemReference.modelId) :
        // We use `collection.models[x]` vs `collection.at(x)` because the ProxyCollection doesn't update the index
        currentNavigationCollectionItem.collection.models[currentItemReference.modelIndex];

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

  // When you start/switch navigating a navigableCollection, we need to find where
  // you should start off and set the current reference
  startNavigation: function(e, mapKey, shouldGoToActive) {
    // Clear out any previous focus as we have moved to a new area
    this.blurCurrentItem();

    // Find the first active item
    // This will ensure we start from where the user is currently is
    var activeCollectionItemResult;
    var activeModelResult;
    if(shouldGoToActive) {
      activeCollectionItemResult = findNextActiveItem(
        this.navigableCollectionListMap[mapKey],
        0,
        sanitizeDir.FORWARDS,
        function(navigableCollectionItem, navigableCollectionItemIndex) {//jshint unused: false
          if(navigableCollectionItemActiveCb(navigableCollectionItem)) {
            var modelResult = findNextActiveItem(
              navigableCollectionItem.collection.models,
              0,
              sanitizeDir.FORWARDS,
              function(model, modelIndex) {
                return !model.get('isHidden') && model.get('active');
              }
            );

            if(modelResult) {
              activeModelResult = modelResult;
              return true;
            }
          }
        }
      );

      if(activeCollectionItemResult && activeModelResult) {
        // Save it as the current
        this.currentNavigableItemReference = {
          mapKey: mapKey,
          listIndex: activeCollectionItemResult.index,
          modelId: activeModelResult.item.id,
          modelIndex: activeModelResult.index
        };
        activeModelResult.item.trigger(FOCUS_EVENT);
      }
    }

    // Fallback to find the first item in the first active collection
    if(!shouldGoToActive || !activeCollectionItemResult) {
      var nextModelResult = findNextNavigableModel(this.navigableCollectionListMap[mapKey], {
        mapKey: mapKey,
        listIndex: null,
        modelIndex: null
      }, sanitizeDir.FORWARDS);

      if(nextModelResult) {
        // Save it as the current
        this.currentNavigableItemReference = _.extend(this.currentNavigableItemReference, nextModelResult.reference);
        nextModelResult.model.trigger(FOCUS_EVENT);
      }
    }
  },


  // Move to the next progressable item forwards/backwards depending on `dir`
  progressInDirection: function(dir) {
    dir = sanitizeDir(dir);
    var nextModelResult = findNextNavigableModel(this.getCurrentReferenceCollectionList(), this.currentNavigableItemReference, dir);

    if(nextModelResult) {
      // Deactivate the current item
      this.blurCurrentItem();

      // Activate the next item
      this.currentNavigableItemReference = _.extend(this.currentNavigableItemReference, nextModelResult.reference);
      nextModelResult.model.trigger(FOCUS_EVENT);
    }
  },

  // Move to the next exact item according to their index across the collection list
  progressToIndex: function(mapKey, targetIndex) {
    var previousItemCount = 0;

    var nextModelResult;
    var collectionItemWithNextModelResult = findNextActiveItem(
      this.navigableCollectionListMap[mapKey],
      0,
      sanitizeDir.FORWARDS,
      function(navigableCollectionItem) {
        var nonHiddenModels = navigableCollectionItem.collection.models.filter(function(model) {
          return !model.get('isHidden');
        });

        var currentItemCount = previousItemCount + nonHiddenModels.length;
        if((currentItemCount - 1) >= targetIndex) {
          var nextModelIndex = targetIndex - previousItemCount;

          nextModelResult = {
            item: navigableCollectionItem.collection.models[nextModelIndex],
            index: nextModelIndex
          };
          return true;
        }

        previousItemCount = currentItemCount;
      }
    );

    if(collectionItemWithNextModelResult && nextModelResult) {
      // Deactivate the current item
      this.blurCurrentItem();

      // Save it as the current
      this.currentNavigableItemReference = {
        mapKey: mapKey,
        listIndex: collectionItemWithNextModelResult.index,
        modelId: nextModelResult.item.id,
        modelIndex: nextModelResult.index
      };
      nextModelResult.item.trigger(FOCUS_EVENT);
    }
  },

  // Helper function to determine whether it is ok to use the `Tab` event to navigate the items.
  // We want to be able to escape out of this list of items once we `Tab` at the end of the list or
  // we were at the start of the list using `Shift + Tab`
  shouldCaptureTabEvent: function(e) {//jshint maxcomplexity:5
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
      this.progressInDirection(sanitizeDir.BACKWARDS);
      e.preventDefault();
      e.stopPropagation();
    }
  },

  // Move to the next item in the current navigableCollection
  selectNext: function(e, mapKey) {
    if(this.shouldHandleEvent(e, mapKey)) {
      this.progressInDirection(sanitizeDir.FORWARDS);
      e.preventDefault();
      e.stopPropagation();
    }
  },

  selectByIndex: function (e, mapKey, handler) { //jshint unused:true
    var keys = handler.key.split('+');
    var key = keys[keys.length - 1];

    var keyInt = parseInt(key, 10);
    var index = keyInt > 0 ? keyInt - 1 : 0;
    if(keyInt === 0) {
      index = 9;
    }

    this.progressToIndex(mapKey, index);
  }


});

cocktail.mixin(KeyboardControllerView, KeyboardEventMixin);


module.exports = KeyboardControllerView;
