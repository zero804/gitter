"use strict";

var navConstants = require('../../constants/navigation');

module.exports = function navigateToCategory(category){

  if(!category) {
    throw new Error('navigateToCategory must be called with a category value');
  }

  return {
    /*
     TODO -->
     Move this into a specific event,
     the NAVIGATE_TO event is too generic
    */
    type: navConstants.NAVIGATE_TO,
    route: 'forum',
    category: category
  };
};
