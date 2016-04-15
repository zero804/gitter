
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

  // public method meant to be used on the outside
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
    console.log('keyboard-controller-view init');

    this.currentNavigableItemReference = {
      mapKey: null,
      navigableItemIndex: null,
      modelId: null
    };
    this.navigableCollectionItemsMap = {};

    // TODO: Listen for any changes and set the new bookmark to any new active items
    //   this.listenTo(this.roomMenuModel, 'change:state', /* cb to update bookmark */, this);
  },


  findNextActiveNavigableCollection: function(navigableCollectionItems, startingIndex, dir) {
    // We accept 1/-1 or true/false
    var dir = (dir === false) ? -1 : Math.sign(dir || 1);

    // Recursive function
    var lookAtNextCollection = function lookAtNextCollection(index) {
      var incrementedIndex = index + dir;
      var nextIndex = incrementedIndex;
      //console.log('nb', nextIndex, startingIndex, dir);
      if(dir > 0 && incrementedIndex >= navigableCollectionItems.length) {
        nextIndex = 0;
      }
      else if(dir < 0 && incrementedIndex < 0) {
        nextIndex = navigableCollectionItems.length - 1;
      }

      var potentialNextCollectionItem = navigableCollectionItems[nextIndex];
      //console.log('na', nextIndex, startingIndex, dir);

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

  blurCurrentItem: function() {
    var currentItemReference = this.currentNavigableItemReference;
    console.log('bci', currentItemReference);
    if(!isNullOrUndefined(currentItemReference.mapKey) && !isNullOrUndefined(currentItemReference.navigableItemIndex) && !isNullOrUndefined(currentItemReference.modelId)) {
      console.log('blurring current model');
      var currentModel = this.navigableCollectionItemsMap[currentItemReference.mapKey][currentItemReference.navigableItemIndex].collection.get(currentItemReference.modelId);
      currentModel.trigger(BLUR_EVENT);
    }
  },

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

    console.log('startNavigation', mapKey, startModel);

    if(startModel) {
      // Save it as the current
      this.currentNavigableItemReference = {
        mapKey: mapKey,
        navigableItemIndex: startNavigableCollectionItem.index,
        modelId: startModel.id
      };
      console.log('new current reference:', this.currentNavigableItemReference);
      startModel.trigger(FOCUS_EVENT);
    }
  },


  progressInDirection: function(dir, mapKey) {
    console.log('--------------------------------------------------------------------------------------');
    // We accept 1/-1 or true/false
    var dir = (dir === false) ? -1 : Math.sign(dir);
    var navigableCollectionItems = this.navigableCollectionItemsMap[mapKey];

    console.log('panel-view progressInDirection', dir, this.currentNavigableItemReference);

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
        // If we had a bookmark, find it in the collection
        collectionItemForActiveModel.collection.get(this.currentNavigableItemReference.modelId) :
        // Default to the first model in the collection
        collectionItemForActiveModel.collection.models[0];

      console.log('--');


      if(activeModel) {
        // Find the index of the active model in our collection
        var activeIndex = 0;
        // We use `collection.models...` vs `collection.indexOf(model)` because the ProxyCollection doesn't update the index
        collectionItemForActiveModel.collection.models.some(function(model, index) {
          //console.log(model.id, activeModel.id)
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

        /* * /
        console.log(
          'cl',
          collectionItemForActiveModel && collectionItemForActiveModel.collection.length,
          nextCollectionItem && nextCollectionItem.collection.length
        );
        /* */

        // Find the next model in the right collection
        var collectionItemWithNextModel = collectionItemForActiveModel;
        var nextInDirectionIndex = activeIndex + dir;
        console.log('lb', nextInDirectionIndex, activeIndex, collectionItemWithNextModel.collection.length);
        if(dir > 0 && nextInDirectionIndex >= collectionItemForActiveModel.collection.models.length) {
          collectionItemWithNextModel = nextCollectionItem;
          nextInDirectionIndex = 0;
        }
        else if(dir < 0 && nextInDirectionIndex < 0) {
          collectionItemWithNextModel = nextCollectionItem;
          nextInDirectionIndex = collectionItemWithNextModel.collection.models.length - 1;
        }
        console.log('la', nextInDirectionIndex, activeIndex, collectionItemWithNextModel.collection.length);

        // We use `collection.models[x]` vs `collection.at(x)` because the ProxyCollection doesn't update the index
        var nextInDirectionModel = collectionItemWithNextModel.collection.models[nextInDirectionIndex];


        // Deactivate the current item
        this.blurCurrentItem();

        // Activate the next item
        if(nextInDirectionModel) {
          //console.log('next', nextInDirectionIndex, nextInDirectionModel);
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

  selectPrev: function(e, mapKey) {
    this.progressInDirection(-1, mapKey);
    e.preventDefault();
    e.stopPropagation();
  },

  selectNext: function(e, mapKey) {
    this.progressInDirection(1, mapKey);
    e.preventDefault();
    e.stopPropagation();
  }


});

cocktail.mixin(KeyboardControllerView, KeyboardEventMixin);


module.exports = KeyboardControllerView;
