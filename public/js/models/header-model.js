"use strict"

var Backbone = require('backbone');
var context = require('utils/context');

module.exports = Backbone.Model.extend({
  initialize: function (attrs, options){
    this.parse();
    //update when a room changes
    this.listenTo(context.troupe(), 'change:id', this.parse, this);
  },
  parse: function (){
    var roomModel = context.troupe();
    var userModel = context.user();

    this.set({
      troupeName: roomModel.get('name'),
      troupeFavourite: !!roomModel.get('favourite'),
      favourite: !!roomModel.get('favourite'),
      troupeTopic: roomModel.get('topic'),
      avatarUrl: getRoomImgUrl(roomModel, userModel),
      ownerIsOrg: ownerIsOrg(roomModel),
      user: !!userModel.get('id'),
      archives: false,
      onToOne: (roomModel.get('githubType') === 'ONETOONE'),
      githubLink: getGithubUrl(roomModel),
      isPrivate: (roomModel.get('security') === 'PRIVATE')
    });
  }
});

function getGithubUrl(roomModel) {
  return roomModel.get('githubType') === 'REPO' &&
    'https://github.com' + roomModel.get('url');
}

function getRoomImgUrl(roomModel, userModel){
    // Room image
    var imgUrl;
    var roomType = roomModel.get('githubType');

    //if we have a provate room we use the repo url
    if(roomModel.get('security') === 'PRIVATE'){
      roomType = 'REPO';
    }

    switch(roomType){
      //a user channel uses the user's avatar
      case 'USER_CHANNEL':
      case 'REPO':
        imgUrl = userModel.get('avatarUrlMedium');
        break;
      //org rooms use the org's avatar url
      case 'ORG_CHANNEL':
      case 'ORG':
        imgUrl = 'https://avatars.githubusercontent.com/' +
                  roomModel.get('name').split('/')[0];
        break;
    }
    return imgUrl;
}

function ownerIsOrg(roomModel){
  var roomType = roomModel.get('githubType');
  return (roomType === 'ORG' || roomType === 'ORG_CHANNEL');
}
