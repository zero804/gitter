'use strict';

var _ = require('underscore');
var Backbone = require('backbone');
var ProxyCollection = require('backbone-proxy-collection');
var VirtualMultipleCollection = require('../virtual-multiple-collection');

var template = require('./community-creation-invite-people-view.hbs');
var CommunityCreateBaseStepView = require('./community-creation-base-step-view');
var CommunityCreationPeopleListView = require('./community-creation-people-list-view');
var UserResultListView = require('./community-create-invite-user-result-list-view');

var userSearchModels = require('collections/user-search');
var collaboratorsModels = require('collections/collaborators');

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
      inviteListView: { el: '.community-create-invite-list-root', init: 'initInviteListView' }
    },
  },

  initUserResultListView: function(optionsForRegion) {
    this.userResultListView = new UserResultListView(optionsForRegion({
      collection: this.userResultCollection
    }));
    this.listenTo(this.userResultListView, 'user:activated', this.onPersonSelected, this);
    return this.userResultListView;
  },

  initInviteListView: function(optionsForRegion) {
    this.inviteListView = new CommunityCreationPeopleListView(optionsForRegion({
      collection: this.inviteCollection,//this.communityCreateModel.get('peopleToInvite'),
      model: new Backbone.Model({
        canRemove: true
      })
    }));
    this.listenTo(this.inviteListView, 'person:remove', this.onPersonRemoved, this);
    return this.inviteListView;
  },

  ui: _.extend({}, CommunityCreateBaseStepView.prototype.ui, {
    peopleInput: '.community-invite-people-name-input',
    inviteList: '.community-create-invite-list',
    emailForm: '.js-community-invite-people-email-form',
    emailInput: '.community-invite-people-email-input',
    emailSubmit: '.community-invite-people-email-submit-button'
  }),

  events: _.extend({}, CommunityCreateBaseStepView.prototype.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
    'input @ui.peopleInput': 'onPeopleInputUpdate',
    'submit @ui.emailForm': 'onEmailSubmit'
  }),

  initialize: function() {
    CommunityCreateBaseStepView.prototype.initialize.apply(this, arguments);

    this.userSearchCollection = new userSearchModels.Collection();
    this.userSuggestionCollection = new collaboratorsModels.CollabCollection();
    this.userSuggestionCollection.fetch();

    this.userResultCollection = new ProxyCollection({
      collection: this.userSuggestionCollection
    });

    this.inviteCollection = new VirtualMultipleCollection([], {
      backingCollections: [
        this.communityCreateModel.get('peopleToInvite'),
        this.communityCreateModel.get('emailsToInvite')
      ]
    });

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
    if(input.length) {
      this.userResultCollection.switchCollection(this.userSearchCollection);
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
    }
    else {
      this.userResultCollection.switchCollection(this.userSuggestionCollection);
    }
  },

  onPersonSelected: function(person) {
    this.communityCreateModel.get('peopleToInvite').add(person);
  },

  onPersonRemoved: function(person) {
    this.communityCreateModel.get('peopleToInvite').remove(person);
    this.communityCreateModel.get('emailsToInvite').remove(person);
  },

  onEmailSubmit: function(e) {
    var newEmailAddress = this.ui.emailInput[0].value;

    if(newEmailAddress.length) {
      this.communityCreateModel.get('emailsToInvite').add({
        emailAddress: newEmailAddress
      });
    }

    // Clear the input
    this.ui.emailInput[0].value = '';

    e.preventDefault();
  },
});
