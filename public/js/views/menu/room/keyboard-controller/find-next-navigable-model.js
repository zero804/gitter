'use strict';

var _ = require('underscore');
var sanitizeDir = require('./sanitize-direction');
var findNextActiveItem = require('./find-next-active-item');


var navigableCollectionItemActiveCb = function(navigableCollectionItem) {
  return (navigableCollectionItem.getActive || function() { return true; }).apply(this, arguments);
};

var findNextNavigableModel = function(navigableCollectionList, navigableItemReference, dir) {
  dir = sanitizeDir(dir);

  var numberOfActiveNavigableCollectionItems = navigableCollectionList.reduce(function(prevCount, item, index) {
    return navigableCollectionItemActiveCb(item, index) ? (prevCount + 1) : prevCount;
  }, 0);

  // Start on the current reference
  var startingListIndex = (dir > 0 ? navigableItemReference.listIndex-1 : navigableItemReference.listIndex+1);
  // Need to correct when rolling over backwards
  if(dir < 0 && navigableItemReference.listIndex <= 0 && navigableItemReference.modelIndex <= 0) {
    startingListIndex = 0;
  }

  var nextModelResult;
  var collectionItemWithNextModelResult = findNextActiveItem(
    navigableCollectionList,
    startingListIndex,
    dir,
    function(navigableCollectionItem, navigableCollectionItemIndex) {//jshint maxcomplexity:9
      if(navigableCollectionItemActiveCb(navigableCollectionItem, navigableCollectionItemIndex)) {

        // Find the potentially next active item
        var modelResult = findNextActiveItem(
          navigableCollectionItem.collection.models,
          // Start at the bookmark if we are looking in that list otherwise, start from the beginning
          (navigableCollectionItemIndex === navigableItemReference.listIndex ? navigableItemReference.modelIndex : null),
          dir,
          function(model, modelIndex) {//jshint unused: false
            return !model.get('isHidden');
          }
        );


        // Check to make sure we aren't at the extremes of the available non-hidden items
        // Otherwise just move on to the next collectionItem.
        // This check only matters if there is more than one collection and
        // is what allows us to transfer over to the next.
        if(numberOfActiveNavigableCollectionItems > 1 && navigableCollectionItemIndex === navigableItemReference.listIndex) {
          var isMoreItemsFoward = navigableItemReference.modelIndex < navigableCollectionItem.collection.models.length-1 &&
            // Check if item is the same as the current reference
            (modelResult && modelResult.index > navigableItemReference.modelIndex || navigableItemReference.modelIndex === null);

          var isMoreItemsBackward = navigableItemReference.modelIndex > 0 &&
          	// Check if item is the same as the current reference
            (modelResult && modelResult.index < navigableItemReference.modelIndex | navigableItemReference.modelIndex === null);

          if(dir > 0 && !isMoreItemsFoward) {
            return false;
          }
          else if(dir < 0 && !isMoreItemsBackward) {
            return false;
          }
        }


        if(modelResult) {
          nextModelResult = modelResult;
          return true;
        }
      }
    }
  );

  if(collectionItemWithNextModelResult && nextModelResult) {
    return {
      model: nextModelResult.item,
      reference: _.extend({}, navigableItemReference, {
        listIndex: collectionItemWithNextModelResult.index,
        modelId: nextModelResult.item.id,
        modelIndex: nextModelResult.index
      })
    };
  }

  return null;
};


module.exports = findNextNavigableModel;
module.exports.navigableCollectionItemActiveCb = navigableCollectionItemActiveCb;
