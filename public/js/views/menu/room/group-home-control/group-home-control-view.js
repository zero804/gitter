'use strict';

var Marionette = require('backbone.marionette');
var _ = require('underscore');
var template = require('./group-home-control-view.hbs');
var toggleClass = require('../../../../utils/toggle-class');
var appEvents = require('../../../../utils/appevents');
var clientEnv = require('gitter-client-env');
var urlJoin = require('url-join');

module.exports = Marionette.ItemView.extend({

  template: template,

  modelEvents: {
    'change:state': 'onModelChangeState'
  },

  events: {
    'click': 'onClick'
  },

  initialize: function(attrs) {
    this.groupsCollection = attrs.groupsCollection;
    this.onModelChangeState();
  },

  serializeData: function(){
    var data = this.model.toJSON();
    var groupId = this.model.get('groupId');
    var groupModel = this.groupsCollection.get(groupId);
    var homeUri = '';
    if(groupModel) { homeUri = groupModel.get('homeUri'); }
    return _.extend({}, data, {
      homeUri: homeUri
    });
  },

  onModelChangeState: function(){
    var state = this.model.get('state');
    toggleClass(this.el, 'hidden', state !== 'org');
  },

  onClick: function(e){
    e.preventDefault();
    e.stopPropagation();

    //Get fully qualified group model
    var groupId = this.model.get('groupId');
    var groupModel = this.groupsCollection.get(groupId);

    if(!groupModel) { return; }

    //Build org profile room url
    var groupHomeUri = groupModel.get('homeUri');
    var groupName = groupModel.get('name');
    var orgUrl = urlJoin(clientEnv.basePath, groupHomeUri);

    //Call navigation
    appEvents.trigger('navigation', orgUrl, 'iframe', groupName);
  }

})
