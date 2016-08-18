'use strict';

var _ = require('underscore');
var Backbone = require('backbone');
var apiClient = require('../../../components/apiClient');

var stepConstants = require('../step-constants');
var peopleToInviteStatusConstants = require('../people-to-invite-status-constants');
var template = require('./community-creation-invite-people-view.hbs');
var CommunityCreateBaseStepView = require('../shared/community-creation-base-step-view');
var CommunityCreationPeopleListView = require('../shared/community-creation-people-list-view');
var UserResultListView = require('../shared/community-create-invite-user-result-list-view');

var UserResultCollection = require('collections/community-create-user-result-collection');

require('gitter-styleguide/css/components/headings.css');
require('gitter-styleguide/css/components/buttons.css');


var _super = CommunityCreateBaseStepView.prototype;


module.exports = CommunityCreateBaseStepView.extend({
  template: template,

  className: 'community-create-step-wrapper community-create-invite-people-step-wrapper',

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
      collection: this.inviteCollection,
      communityCreateModel: this.communityCreateModel,
      model: new Backbone.Model({
        canRemove: true,
        canEditEmail: true
      })
    }));
    this.listenTo(this.inviteListView, 'person:remove', this.onPersonRemoved, this);
    return this.inviteListView;
  },

  ui: _.extend({}, _super.ui, {
    peopleInput: '.js-community-invite-people-name-input',
    emailForm: '.js-community-invite-people-email-form',
    emailInput: '.js-community-invite-people-email-input',
    emailSubmit: '.js-community-invite-people-email-submit-button'
  }),

  events: _.extend({}, _super.events, {
    'click @ui.nextStep': 'onStepNext',
    'click @ui.backStep': 'onStepBack',
    'input @ui.peopleInput': 'onPeopleInputUpdate',
    'submit @ui.emailForm': 'onEmailSubmit'
  }),


  initialize: function(options) {
    _super.initialize.apply(this, arguments);

    this.orgCollection = options.orgCollection;
    this.repoCollection = options.repoCollection;
    this.inviteCollection = options.inviteCollection;
    this.troubleInviteCollection = options.troubleInviteCollection;

    this.searchModel = new Backbone.Model({
      searchInput: ''
    });
    this.userResultCollection = new UserResultCollection(null, {
      stepViewModel: this.model,
      searchModel: this.searchModel,
      communityCreateModel: this.communityCreateModel,
      orgCollection: this.orgCollection,
      repoCollection: this.repoCollection
    })

  },

  onStepNext: function() {
    // Only go to confirmation if there was trouble
    if(this.troubleInviteCollection.length > 0) {
      this.communityCreateModel.set('stepState', stepConstants.INVITE_CONFIRMATION);
    }
    else {
      this.communityCreateModel.set('stepState', stepConstants.OVERVIEW);
    }
  },
  onStepBack: function() {
    this.communityCreateModel.set('stepState', stepConstants.MAIN);
  },

  onPeopleInputUpdate: function() {
    this.searchModel.set('searchInput', this.ui.peopleInput[0].value);
  },

  onPersonSelected: function(person) {
    // We want the defaults added to the model as well
    var newPerson = this.communityCreateModel.peopleToInvite.add(person.toJSON());
    var checkInviteParams = {
      githubUsername: newPerson.get('githubUsername'),
      twitterUsername: newPerson.get('twitterUsername'),
      emailAddress: newPerson.get('emailAddress')
    };
    // TODO: Make this more robust
    // Currently using workaround for search endpoint, https://github.com/troupe/gitter-webapp/issues/1759#issuecomment-231992894
    if(newPerson.get('id')) {
      checkInviteParams.username = newPerson.get('username');
    }
    else if(!checkInviteParams.githubUsername) {
      checkInviteParams.githubUsername = newPerson.get('username');
    }

    apiClient.priv.get('/check-invite', checkInviteParams)
      .then(function() {
        newPerson.set('inviteStatus', peopleToInviteStatusConstants.READY);
      })
      .catch(function() {
        newPerson.set('inviteStatus', peopleToInviteStatusConstants.NEEDS_EMAIL);
      });
  },

  onPersonRemoved: function(person) {
    this.communityCreateModel.peopleToInvite.remove(person);
    this.communityCreateModel.emailsToInvite.remove(person);
  },

  onEmailSubmit: function(e) {
    var newEmailAddress = this.ui.emailInput[0].value;

    if(newEmailAddress.length) {
      this.communityCreateModel.emailsToInvite.add({
        emailAddress: newEmailAddress
      });
    }

    // Clear the input
    this.ui.emailInput[0].value = '';

    e.preventDefault();
  },
});
