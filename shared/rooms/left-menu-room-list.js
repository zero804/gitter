'use strict';

var defaultFilter = require('../filters/left-menu-primary-default');
var one2oneFilter = require('../filters/left-menu-primary-one2one');
var orgFilter = require('../filters/left-menu-primary-org');

var defaultSort = require('../sorting/left-menu-primary-default');

var parseToTemplateItem = require('../parse/left-menu-primary-item');

module.exports = function generateLeftMenuRoomsList(state, rooms, groupId){

  var filter;
  switch(state) {
    //Here we dont return rooms for temp-org because if you are in the temp-org state
    //that you cannot have joined any of the parent group's rooms
    case 'temp-org':
    case 'search':
      filter = function(){ return false; };
      break;
    case 'people':
      filter = one2oneFilter;
      break;
    case 'org':
      filter = function(model) { return orgFilter(model, groupId) };
      break;
    default:
      filter = function(){ return true; };
  }

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

};
