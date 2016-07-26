"use strict";

var Backbone = require('backbone');
var BaseResolverCollection = require('./base-resolver-collection');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');


var ContextModel = Backbone.Model.extend({
  defaults: { groupName: null, }
});

module.exports = BaseResolverCollection.extend({

  //As it stands today when we visit a temp org the only info we know about that org is the current uri
  //With this in mind we have to use the old suggested rooms by name endpoint as this means we dont have
  //to do an id lookup before we can get the suggestions
  template: '/v1/orgs/:groupName/suggestedRooms',

  constructor: function(models, attrs) {
    this.roomMenuModel = attrs.roomMenuModel;
    var state = this.roomMenuModel.get('state');
    var modelVars = {};
    if(state === 'temp-org') { modelVars = { groupName: this.getGroupName(), }; }
    this.contextModel = new ContextModel(modelVars);
    BaseResolverCollection.prototype.constructor.apply(this, arguments);
    this.listenTo(this.contextModel, 'change:groupName', this.fetch, this);
    this.listenTo(this.roomMenuModel, 'change:state', this.onModelUpdate, this);
    if(state === 'temp-org') { this.fetch(); }

  },

  onModelUpdate: function (){
    if(this.roomMenuModel.get('state') !== 'temp-org') { return; }
    this.contextModel.set('groupName', this.getGroupName());
  },

  getGroupName: function(){
    return getOrgNameFromUri(document.location.pathname);
  },
});
