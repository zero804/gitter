"use strict";

var MinibarItemView  = require('../minibar-item-view');
var _ = require('underscore');
var toggleClass = require('utils/toggle-class');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var context = require('utils/context');
var _super = MinibarItemView.prototype;

module.exports = MinibarItemView.extend({
initialize: function(attrs, options) {
    _super.initialize.apply(this, arguments);
    this.roomCollection = attrs.roomCollection;
    this.listenTo(this.model.troupe, 'change:id', this.onRoomChange, this);
    this.listenTo(this.model, 'change:hidden', this.render, this);
  },

  onRoomChange: function (model, val){
    //If the new room is not in the room list then show the temp icon
    //as we are sure we should be showing a temp org
    //return context.hasFeature('groups') && this.model.set('hidden', !!this.roomCollection.get(val));

    this.model.set('hidden', !!this.roomCollection.get(val));
  },

  serializeData: function (){
    var data = this.model.toJSON();
    var name = (data.name || document.location.pathname);
    return  _.extend({}, _super.serializeData.apply(this, arguments), {
      avatarSrcset: resolveRoomAvatarSrcSet({ uri: name }, 22),
    });
  },

  onRender: function (){
    toggleClass(this.el, 'hidden', this.model.get('hidden'));
  },
});
