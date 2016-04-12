'use strict';

var favouriteFilter         = require('../filters/left-menu-primary-favourite');
var favouriteOneToOneFilter = require('../filters/left-menu-primary-favourite-one2one');
var orgFavouriteFilter      = require('../filters/left-menu-primary-favourite-org');

var favouriteSort           = require('../sorting/left-menu-primary-favourite');
var defaultSort             = require('../sorting/left-menu-primary-default');

var parseToTemplateItem     = require('../parse/left-menu-primary-item');

module.exports = function generateLemMenuFavouriteRoomsList(state, rooms, selectedOrgName) {

  switch(state) {
    case 'search':
      return [];
    case 'people':
      return rooms.filter(favouriteOneToOneFilter).sort(defaultSort).map(function(room){
        return parseToTemplateItem(room, state);
      });
    case 'org':
      return rooms
        .filter(function(model){ return orgFavouriteFilter(model, selectedOrgName); })
        .sort(defaultSort)
        .map(function(room){
          return parseToTemplateItem(room, state);
        });
    default:
      return rooms.filter(favouriteFilter).sort(favouriteSort).map(function(room){
        return parseToTemplateItem(room, state);
      });
  }

};
