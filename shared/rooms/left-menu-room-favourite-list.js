'use strict';

var favouriteFilter         = require('../filters/left-menu-primary-favourite');
var favouriteOneToOneFilter = require('../filters/left-menu-primary-favourite-one2one');
var orgFavouriteFilter      = require('../filters/left-menu-primary-favourite-org');

var favouriteSort           = require('../sorting/left-menu-primary-favourite');

var parseToTemplateItem     = require('../parse/left-menu-primary-item');

module.exports = function generateLemMenuFavouriteRoomsList(state, rooms, selectedOrgName) {

  var filter;
  switch(state) {
    case 'search':
      filter = function(){ return false; };
      break;
    case 'people':
      filter = favouriteOneToOneFilter;
      break;
    case 'org':
      filter = function(model) { return orgFavouriteFilter(model, selectedOrgName) };
      break;
    default:
      filter = favouriteFilter;
  }

  return rooms
  .filter(favouriteFilter)
  .map(function(model){
    if(!filter(model)) {
      if(model.get) { model.set('isHidden', true); }
      model.isHidden = true;
    }
    return parseToTemplateItem(model, state);
  })
  .sort(favouriteSort);
};
