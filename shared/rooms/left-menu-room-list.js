'use strict';

var defaultFilter   = require('../filters/left-menu-primary-default');
var favouriteFilter = require('../filters/left-menu-primary-favourite');
var one2oneFilter   = require('../filters/left-menu-primary-one2one');
var orgFilter       = require('../filters/left-menu-primary-org');

var defaultSort = require('../sorting/left-menu-primary-default');
var favouriteSort = require('../sorting/left-menu-primary-favourite');

var parseToTemplateItem = require('../parse/left-menu-primary-item');

module.exports = function(state, rooms, selectedOrgName){
  switch(state) {
    case 'search':
      return [];
    case 'favourite':
      return rooms.filter(favouriteFilter).sort(favouriteSort).map(parseToTemplateItem);
    case 'people':
      return rooms.filter(one2oneFilter).sort(defaultSort).map(parseToTemplateItem);
    case 'org':
      return rooms
        .fliter(function(model){ return orgFilter(model, selectedOrgName); })
        .sort(defaultSort)
        .map(parseToTemplateItem);
    default:
      return rooms.filter(defaultFilter).sort(defaultSort).map(parseToTemplateItem);
  }
};
