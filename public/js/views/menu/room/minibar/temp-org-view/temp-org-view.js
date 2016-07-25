"use strict";

var MinibarItemView  = require('../minibar-item-view');
var _ = require('underscore');
var toggleClass = require('utils/toggle-class');
var context = require('utils/context');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');
var avatars = require('gitter-web-avatars');

var _super = MinibarItemView.prototype;

module.exports = MinibarItemView.extend({
initialize: function(attrs, options) {
    _super.initialize.apply(this, arguments);
    this.roomCollection = attrs.roomCollection;
    this.groupCollection = attrs.groupCollection;
    this.roomMenuModel = attrs.roomMenuModel;
    this.listenTo(this.model.troupe, 'change:id', this.onRoomChange, this);
    this.listenTo(this.model, 'change:hidden', this.render, this);
  },

  onRoomChange: function (model, val){
    var groupUri = getOrgNameFromUri(this.getRoomUri());
    //For any /home/* url's just hide
    if(/^home/.test(groupUri)) { return this.model.get('hidden', true); }
    var hasGroup = !!this.groupCollection.findWhere({ uri: groupUri });
    //Render so we can get the right src on the buttons img
    if(!hasGroup) { this.render(); }
    this.model.set('hidden', hasGroup);
  },

  serializeData: function (){
    var data = this.model.toJSON();
    var uri = getOrgNameFromUri(this.getRoomUri());
    var imgDetails = avatars.getForRoomUri(uri);
    return  _.extend({}, data,  _super.serializeData.apply(this, arguments), {
      avatarUrl: imgDetails,
    });
  },

  getRoomUri: function (model){
    return (context.troupe().get('uri') || document.location.pathname);
  },

  onRender: function (){
    toggleClass(this.el, 'hidden', this.model.get('hidden'));
  },
});
