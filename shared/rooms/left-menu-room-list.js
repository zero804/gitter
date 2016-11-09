'use strict';

var defaultFilter = require('../filters/left-menu-primary-default');
var one2oneFilter = require('../filters/left-menu-primary-one2one');
var orgFilter = require('../filters/left-menu-primary-org');
var defaultSort = require('../sorting/left-menu-primary-default');
var parseToTemplateItem = require('../parse/left-menu-primary-item');

var NOTHING_FILTER = function() { return false; };
var EVERYTHING_FILTER = function() { return true; };

function getFilterForState(state, groupId) {
  switch(state) {
    //Here we dont return rooms for temp-org because if you are in the temp-org state
    //that you cannot have joined any of the parent group's rooms
    case 'temp-org':
    case 'search':
      return NOTHING_FILTER;

    case 'people':
      return one2oneFilter;

    case 'org':
      return function(model) { return orgFilter(model, groupId) };

    default:
      return EVERYTHING_FILTER;
  }

}

function generateLeftMenuRoomsList(state, rooms, groupId){
  var filter = getFilterForState(state, groupId);

  return rooms
    .filter(defaultFilter)
    .map(function(model){
      if(!filter(model)) {
        if(model.get) { model.set('isHidden', true); }
        model.isHidden = true;
      }
      return parseToTemplateItem(model, state);
    })
    .sort(defaultSort);

}

module.exports = generateLeftMenuRoomsList;
