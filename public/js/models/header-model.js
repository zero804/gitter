'use strict';

var Backbone = require('backbone');
var context = require('utils/context');

module.exports = Backbone.Model.extend({
  initialize: function() {
    this.parse();

    //update when a room changes
    this.listenTo(context.troupe(), 'change:id', this.parse, this);
    this.listenTo(context.troupe(), 'change:topic', this.syncTopic, this);
  },

  parse: function() {
    var roomModel = context.troupe();
    var userModel = context.user();

    this.set({
      troupeName:      roomModel.get('name'),
      troupeFavourite: !!roomModel.get('favourite'),
      favourite:       !!roomModel.get('favourite'),
      troupeTopic:     roomModel.get('topic'),
      avatarUrl:       getRoomImgUrl(roomModel, userModel),
      ownerIsOrg:      ownerIsOrg(roomModel),
      user:            !!userModel.get('id'),
      archives:        false,
      oneToOne:        (roomModel.get('githubType') === 'ONETOONE'),
      githubLink:      getGithubUrl(roomModel),
      isPrivate:       getPrivateStatus(roomModel),
    });

  },

  syncTopic: function(roomModel) {
    this.set('topic', roomModel.get('topic'));
  },

});

function getPrivateStatus(roomModel) {
  return roomModel.get('githubType') === 'ORG' ?
    true :
    roomModel.get('security') === 'PRIVATE';
}

function getGithubUrl(roomModel) {
  return roomModel.get('githubType') === 'REPO' &&
    'https://github.com' + roomModel.get('url');
}

function getRoomImgUrl(roomModel) {
  // Room image
  var githubAvatarUrl = 'https://avatars.githubusercontent.com/';
  return githubAvatarUrl + roomModel.get('name').split('/')[0];
}

function ownerIsOrg(roomModel) {
  var roomType = roomModel.get('githubType');
  return (roomType === 'ORG' || roomType === 'ORG_CHANNEL');
}
