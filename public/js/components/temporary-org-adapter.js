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
  onTroupeIdChange(roomCollection, groupCollection, activeRoom, activeRoom.get('id'));

};

function onTroupeIdChange(roomCollection, groupCollection, model, id) {
  if(roomCollection.get(id)) { return; }
  groupCollection.add(getNewOrgItem(model.toJSON()));
}

function getNewOrgItem(data){
  return new GroupModel({ name: getOrgNameFromURI(data.uri), });
}
