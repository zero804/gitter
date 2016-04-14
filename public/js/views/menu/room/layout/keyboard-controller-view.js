
var _                               = require('underscore');
var Marionette                      = require('backbone.marionette');
var cocktail                        = require('cocktail');
var KeyboardEventMixin              = require('views/keyboard-events-mixin');


var MINIBAR_KEY = 'minibar';
var ROOM_LIST_KEY = 'room-list';


var KeyboardControllerView = Marionette.LayoutView.extend({
  constants: {
    MINIBAR_KEY: MINIBAR_KEY,
    ROOM_LIST_KEY: ROOM_LIST_KEY
  },

  keyboardEvents: {
    'room-list.start-nav': 'startKeyboardNavigation',
    'room-list-item.prev': 'selectPrev',
    'room-list-item.next': 'selectNext'
  },

  /* public method meant to be used on the outside */
  inject: function(key, newNavigableCollectionItems) {
    this.navigableCollectionItemsMap[key] = (this.navigableCollectionItemsMap[key] || []).concat(newNavigableCollectionItems);
  },

  initialize: function() {
    console.log('keyboard-controller-view init');

    this.currentNavigableItemReference = {
      mapKey: null,
      navigableItemIndex: null,
      modelId: null
    };
    this.navigableCollectionItemsMap = {};
  },


  findNextActiveNavigableCollection: function(navigableCollectionItems, startingIndex, dir) {
    // We accept 1/-1 or true/false
    var dir = (dir === false) ? -1 : Math.sign(dir || 1);

    // Recursive function
    var lookAtNextCollection = function lookAtNextCollection(index) {
      var incrementedIndex = index + dir;
      var nextIndex = incrementedIndex;
      console.log('nb', nextIndex, startingIndex, dir);
      if(dir > 0 && incrementedIndex >= navigableCollectionItems.length) {
        nextIndex = 0;
      }
      else if(dir < 0 && incrementedIndex < 0) {
        nextIndex = navigableCollectionItems.length - 1;
      }

      var potentialNextCollectionItem = navigableCollectionItems[nextIndex];
      console.log('na', nextIndex, startingIndex, dir);

      // Find our resultant
      var getActiveCb = (potentialNextCollectionItem.getActive || function() { return true; });
      if(getActiveCb()) {
        // Strap on an index for bookmarking our place later on
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

    return lookAtNextCollection(startingIndex);
  },

  startKeyboardNavigation: function() {
    var firstNavigableCollectionItem = this.findNextActiveNavigableCollection(this.navigableCollectionItemsMap[ROOM_LIST_KEY], -1, 1);
    var firstModel = firstNavigableCollectionItem.collection.at(0);

    console.log('startKeyboardNavigation');

    this.currentNavigableItemReference = {
      modelId: firstModel.id,
      navigableItemIndex: firstNavigableCollectionItem.index
    };
    firstModel.trigger('focus:item');
  },

  progressInDirection: function(dir, mapKey) {
    console.log('--------------------------------------------------------------------------------------');
    // We accept 1/-1 or true/false
    var dir = (dir === false) ? -1 : Math.sign(dir);
    var navigableCollectionItems = this.navigableCollectionItemsMap[mapKey];

    console.log('panel-view progressInDirection', dir, this.currentNavigableItemReference);

    // `0` is a valid index but it's falsey :/ so we need to do this check
    var validBookmarkIndex = this.currentNavigableItemReference.navigableItemIndex === 0 || this.currentNavigableItemReference.navigableItemIndex;
    var collectionItemForActiveModel = validBookmarkIndex ?
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

    var activeModel = validBookmarkIndex && this.currentNavigableItemReference.modelId ?
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


      console.log(
        'cl',
        collectionItemForActiveModel && collectionItemForActiveModel.collection.length,
        nextCollectionItem && nextCollectionItem.collection.length
      );

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
      activeModel.trigger('blur:item');

      // Activate the next item
      if(nextInDirectionModel) {
        //console.log('next', nextInDirectionIndex, nextInDirectionModel);
        this.currentNavigableItemReference = {
          mapKey: mapKey,
          navigableItemIndex: collectionItemWithNextModel.index,
          modelId: nextInDirectionModel.id
        };
        nextInDirectionModel.trigger('focus:item');
      }
    }
  },

  selectPrev: function(e) {
    this.progressInDirection(-1, ROOM_LIST_KEY);
    e.preventDefault();
    e.stopPropagation();
  },

  selectNext: function(e) {
    this.progressInDirection(1, ROOM_LIST_KEY);
    e.preventDefault();
    e.stopPropagation();
  }


});

cocktail.mixin(KeyboardControllerView, KeyboardEventMixin);


module.exports = KeyboardControllerView;
