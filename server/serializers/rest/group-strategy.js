"use strict";

var Promise = require('bluebird');
var avatars = require('gitter-web-avatars');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var SecurityDescriptorStrategy = require('./security-descriptor-strategy');
var FavouriteGroupsForUserStrategy = require('./favourite-groups-for-user-strategy');

function GroupStrategy({ currentUserId, includeHasAvatarSet }) {

  var securityDescriptorStrategy;
  var favouriteStrategy;

  this.preload = function() {
    var currentUserObjectId = mongoUtils.asObjectID(currentUserId);
    var strategies = [];

    securityDescriptorStrategy = SecurityDescriptorStrategy.slim();

    if (currentUserObjectId) {
      // Favourites for user
      favouriteStrategy = new FavouriteGroupsForUserStrategy({
        currentUserId: currentUserObjectId
      });
      strategies.push(favouriteStrategy.preload());
    }

    return Promise.all(strategies);
  };

  this.map = function(group) {
    var id = group.id || group._id && group._id.toHexString();

    var hasAvatarSet = undefined;
    if(includeHasAvatarSet) {
      hasAvatarSet = group.avatarVersion > 0 || group.sd.type === 'GH_ORG' || group.sd.type === 'GH_REPO' || group.sd.type === 'GH_USER';
    }

    return {
      id: id,
      name: group.name,
      uri: group.uri,
      favourite: favouriteStrategy ? favouriteStrategy.map(id) : undefined,
      homeUri: group.homeUri,
      backedBy: securityDescriptorStrategy.map(group.sd),
      avatarUrl: avatars.getForGroup(group),
      hasAvatarSet: hasAvatarSet,
      forumId: group.forumId
    };

  };
}

GroupStrategy.prototype = {
  name: 'GroupStrategy'
};

module.exports = GroupStrategy;
