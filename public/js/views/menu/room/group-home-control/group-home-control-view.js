'use strict';

var Marionette = require('backbone.marionette');
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
    var groupUri = groupModel.get('uri');
    var groupName = groupModel.get('name');
    var orgUrl = urlJoin(clientEnv.basePath, '/orgs', groupUri, '/rooms');

    //Call navigation
    appEvents.trigger('navigation', orgUrl, 'iframe', groupName);
  }

})
