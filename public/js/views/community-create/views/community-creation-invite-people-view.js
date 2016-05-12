'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var toggleClass = require('utils/toggle-class');

var template = require('./community-creation-invite-people-view.hbs');
var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var CommunityCreationPeopleListView = require('./community-creation-people-list-view');
var UserResultListView = require('./community-create-invite-user-result-list-view');

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
      collection: this.communityCreateModel.get('peopleToInvite')
    }));
    this.listenTo(this.inviteListView, 'person:remove', this.onPersonRemoved, this);
    return this.inviteListView;
  },

  ui: _.extend({}, CommunityCreateBaseStepView.prototype.ui, {
    peopleInput: '.primary-community-invite-people-name-input',
    inviteList: '.community-create-invite-list'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
    'input @ui.peopleInput': 'onPeopleInputUpdate'
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
  }
});
