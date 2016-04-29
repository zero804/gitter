'use strict';

var _ = require('underscore');
var sanitizeDir = require('./sanitize-direction');
var findNextActiveItem = require('./find-next-active-item');


var navigableCollectionItemActiveCb = function(navigableCollectionItem) {
  return (navigableCollectionItem.getActive || function() { return true })();
};

var findNextNavigableModel = function(navigableCollectionList, navigableItemReference, dir) {
  dir = sanitizeDir(dir);

  console.log('nir-li', navigableItemReference.listIndex);

  // Start on the current reference
  //var startingListIndex = navigableItemReference.listIndex;
  //var startingListIndex = navigableItemReference.listIndex - 1;
  var startingListIndex = (dir > 0 ? navigableItemReference.listIndex-1 : navigableItemReference.listIndex+1);
  /* * /
  // Need to correct when rolling over backwards
  if(dir < 0 && navigableItemReference.listIndex <= 0 && navigableItemReference.modelIndex <= 0) {
    startingListIndex = navigableCollectionList.length;
  }
  /* */
  /* */
  // Need to correct when rolling over backwards
  console.log(dir, startingListIndex, navigableItemReference.modelIndex);
  if(dir < 0 && navigableItemReference.listIndex <= 0 && navigableItemReference.modelIndex <= 0) {
    startingListIndex = 0;
  }
  /* */

  var nextModelResult;
  var collectionItemWithNextModelResult = findNextActiveItem(
    navigableCollectionList,
    startingListIndex,
    dir,
    function(navigableCollectionItem, navigableCollectionItemIndex) {
      if(navigableCollectionItemActiveCb(navigableCollectionItem)) {
        // Check to make sure we weren't at the extremes when we came here
        // Otherwise just move on to the next collectionItem.
        // This check only matters if there is more than one collection and
        // is what allows us to transfer over to the next.
        if(navigableCollectionList.length > 1 && navigableCollectionItemIndex === navigableItemReference.listIndex) {
          console.log('::::', dir, navigableItemReference.modelIndex, navigableCollectionItem.collection.models.length-1);
          if(dir > 0 && navigableItemReference.modelIndex >= navigableCollectionItem.collection.models.length-1) {
            return false;
          }
          else if(dir < 0 && navigableItemReference.modelIndex <= 0) {
            return false;
          }
        }

        var modelResult = findNextActiveItem(
          navigableCollectionItem.collection.models,
          // Start at the bookmark if we are looking in that list otherwise, start from the beginning
          (navigableCollectionItemIndex === navigableItemReference.listIndex ? navigableItemReference.modelIndex : null),
          dir,
          function(model, modelIndex) {
            return !model.get('isHidden');
          }
        );

        if(modelResult) {
          nextModelResult = modelResult;
          return true;
        }
      }
    }
  );

  if(collectionItemWithNextModelResult && nextModelResult) {
    //console.log('nextModelResult', nextModelResult);
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
