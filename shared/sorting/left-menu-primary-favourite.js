'use strict';

module.exports = function leftMenuFavouriteSort(a, b){
  return a.favourite < b.favourite ? -1 : 1;
};
