'use strict';

var _ = require('underscore');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var toggleClass = require('utils/toggle-class');

var template = require('./community-creation-invite-people-view.hbs');
var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var CommunityCreationPeopleListView = require('./community-creation-people-list-view');
var UserResultListView = require('./community-create-invite-user-result-list-view');
var CommunityCreationEmailListView = require('./community-creation-email-list-view');

var userSearchModels = require('collections/user-search');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');




module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  attributes: _.extend({}, CommunityCreateBaseStepView.prototype.attributes, {
    class: 'community-create-step-wrapper community-create-invite-people-step-wrapper'
  }),

  behaviors: {
    Isomorphic: {
      userResultListView: { el: '.community-create-invite-user-result-list-root', init: 'initUserResultListView' },
      inviteListView: { el: '.community-create-invite-list-root', init: 'initInviteListView' },
      inviteEmailListView: { el: '.community-create-invite-email-list-root', init: 'initInviteEmailListView' },
    },
  },

  initUserResultListView: function(optionsForRegion) {
    this.userResultListView = new UserResultListView(optionsForRegion({
      collection: this.userSearchCollection
    }));
    this.listenTo(this.userResultListView, 'user:activated', this.onPersonSelected, this);
    //this.listenTo(this.inviteListView, 'user:cleared', this.onPersonRemoved, this);
    return this.userResultListView;
  },

  initInviteListView: function(optionsForRegion) {
    this.inviteListView = new CommunityCreationPeopleListView(optionsForRegion({
      collection: this.communityCreateModel.get('peopleToInvite'),
      model: new Backbone.Model({
        canRemove: true
      })
    }));
    this.listenTo(this.inviteListView, 'person:remove', this.onPersonRemoved, this);
    return this.inviteListView;
  },

  initInviteEmailListView: function(optionsForRegion) {
    this.inviteEmailListView = new CommunityCreationEmailListView(optionsForRegion({
      collection: this.communityCreateModel.get('emailsToInvite'),
      model: new Backbone.Model({
        canRemove: true
      })
    }));
    this.listenTo(this.inviteEmailListView, 'email:remove', this.onEmailRemoved, this);
    return this.inviteEmailListView;
  },

  ui: _.extend({}, CommunityCreateBaseStepView.prototype.ui, {
    peopleInput: '.community-invite-people-name-input',
    inviteList: '.community-create-invite-list',
    emailInput: '.community-invite-people-email-input',
    emailSubmit: '.community-invite-people-email-submit-button'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
    'input @ui.peopleInput': 'onPeopleInputUpdate',
    'click @ui.emailSubmit': 'onEmailSubmit'
  }),

  initialize: function(options) {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);

    this.userSearchCollection = new userSearchModels.Collection();
    this.throttledFetchUsers = _.throttle(this.fetchUsers, 300);
  },

  onDestroy: function() {
    this.typeahead.destroy();
  },

  onStepNext: function() {
    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.overview);
  },
  onStepBack: function() {
    this.communityCreateModel.set('stepState', this.communityCreateModel.STEP_CONSTANT_MAP.main);
  },

  onPeopleInputUpdate: function() {
    this.throttledFetchUsers();
  },

  fetchUsers: function() {
    var input = this.ui.peopleInput[0].value;
    this.userSearchCollection.fetch({
      data: {
          q: input,
          limit: 12
        }
      },
      {
        add: true,
        remove: true,
        merge: true
      }
    );
  },

  onPersonSelected: function(person) {
    this.communityCreateModel.get('peopleToInvite').add(person);
  },

  onPersonRemoved: function(person) {
    this.communityCreateModel.get('peopleToInvite').remove(person);
  },

  onEmailSubmit: function() {
    var newEmailAddress = this.ui.emailInput[0].value;

    if(newEmailAddress.length) {
      this.communityCreateModel.get('emailsToInvite').add({
        address: newEmailAddress
      });
    }

    // Clear the input
    this.ui.emailInput[0].value = '';
  },

  onEmailRemoved: function(email) {
    this.communityCreateModel.get('emailsToInvite').remove(email);
  }
});
