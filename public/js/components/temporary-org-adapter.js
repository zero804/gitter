"use strict";

var context = require('utils/context');
var _ = require('underscore');
var GroupModel = require('../collections/groups').GroupModel;
var getOrgNameFromURI = require('gitter-web-shared/get-org-name-from-uri');

module.exports = function(roomCollection, groupCollection){

  if(!roomCollection) {
    throw new Error('tempOrgAdapter MUST be called with a valid room collection');
  }

  if(!groupCollection) {
    throw new Error('tempOrgAdapter MUST be called with a valid group collection');
  }

  var activeRoom = context.troupe();
  activeRoom.on('change:id', _.partial(onTroupeIdChange, roomCollection, groupCollection));
  groupCollection.on('reset sync snapshot', _.partial(onTroupeIdChange, roomCollection, groupCollection));
  onTroupeIdChange(roomCollection, groupCollection, activeRoom, activeRoom.get('id'));

};

function onTroupeIdChange(roomCollection, groupCollection) {
  var model = context.troupe();
  var id = model.get('id');
  //If the room is already in the room list, bail.
  if(roomCollection.get(id)) { return; }
  var newGroupModel = getNewOrgItem(model.toJSON());
  //If the group is already in the group list, bail.
  if(groupCollection.findWhere({ name: newGroupModel.get('name')})) { return; }
  groupCollection.add(newGroupModel);
}

function getNewOrgItem(data){
  return new GroupModel({ name: getOrgNameFromURI(data.uri), temp: true, active: true });
}
