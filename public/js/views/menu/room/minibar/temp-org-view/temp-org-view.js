"use strict";

var MinibarItemView  = require('../minibar-item-view');
var _ = require('underscore');
var toggleClass = require('utils/toggle-class');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var context = require('utils/context');
var getOrgnameFromUri = require('gitter-web-shared/get-org-name-from-uri');

var _super = MinibarItemView.prototype;

module.exports = MinibarItemView.extend({
initialize: function(attrs, options) {
    _super.initialize.apply(this, arguments);
    this.roomCollection = attrs.roomCollection;
    this.groupCollection = attrs.groupCollection;
    this.listenTo(this.model.troupe, 'change:id', this.onRoomChange, this);
    this.listenTo(this.model, 'change:hidden', this.render, this);
  },

  onRoomChange: function (model, val){
    //If the new room is not in the room list then show the temp icon
    //as we are sure we should be showing a temp org
    var orgName = getOrgnameFromUri(this.getRoomUri());
    var roomId = val;
    var hasJoinedOrg = !this.roomCollection.get(roomId) && !this.groupCollection.findWhere({ name: orgName });
    this.model.set('hidden', !hasJoinedOrg);
  },

  serializeData: function (){
    var data = this.model.toJSON();
    var uri = this.getRoomUri();
    return  _.extend({}, data,  _super.serializeData.apply(this, arguments), {
      avatarSrcset: resolveRoomAvatarSrcSet({ uri: uri }, 22),
    });
  },

  getRoomUri: function (model){
    return (context.troupe().get('uri') || document.location.pathname);
  },

  onRender: function (){
    toggleClass(this.el, 'hidden', this.model.get('hidden'));
  },
});
