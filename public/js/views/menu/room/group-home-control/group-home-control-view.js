'use strict';

var Marionette = require('backbone.marionette');
var template = require('./group-home-control-view.hbs');
var toggleClass = require('../../../../utils/toggle-class');
var appEvents = require('../../../../utils/appevents');
var context = require('../../../../utils/context');

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

  serializeData: function() {
    var groupModel = this.findGroup();
    var homeUri = groupModel && groupModel.get('homeUri');

    return {
      homeUri: homeUri || ''
    };
  },

  findGroup: function() {
    var groupId = this.model.get('groupId');
    if (!groupId) return null;

    var groupModel = this.groupsCollection.get(groupId);
    if (groupModel) return groupModel;

    // Last ditch attempt.. for groups where the user is not
    // a member of the group...
    var contextGroup = context.group();

    if (contextGroup.id === groupId) {
      return contextGroup;
    }
  },

  onModelChangeState: function() {
    var state = this.model.get('state');
    toggleClass(this.el, 'hidden', state !== 'org');
  },

  onClick: function(e) {
    e.preventDefault();
    e.stopPropagation();

    var groupModel = this.findGroup()

    if(!groupModel) return;

    //Build org profile room url
    var groupHomeUri = groupModel.get('homeUri');
    var groupName = groupModel.get('name');

    //Call navigation
    appEvents.trigger('navigation', '/' + groupHomeUri, 'iframe', groupName);
  }

})
